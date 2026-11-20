const API_KEY = 'КЛЮЧ';
const BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/labs/api';
const DEMO_API = 'https://dummyjson.com';
const LAB_STORAGE_PREFIX = 'lab9';
let ordersData = [], dishesCache = [], orderToDelete = null, dataSource = 'loading';

function showApiStatus(mode, message) {
    const main = document.querySelector('main'); if (!main) return;
    let box = document.getElementById('api-status');
    if (!box) { box = document.createElement('div'); box.id = 'api-status'; box.style.cssText = 'margin:16px auto;padding:11px 16px;max-width:1100px;border-radius:10px;font-size:13px;font-weight:600;line-height:1.5;'; main.prepend(box); }
    box.style.background = mode === 'demo' ? '#fff3e0' : mode === 'error' ? '#fdecea' : '#e9f7ef';
    box.style.color = mode === 'demo' ? '#9a4d12' : mode === 'error' ? '#a12622' : '#216b42'; box.textContent = message;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function formatDate(value) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; return date.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function mapDummyRecipes(recipes) {
    const categories = ['soup', 'main', 'salad', 'drink', 'dessert'];
    return recipes.map((recipe, index) => ({ id: 9000 + Number(recipe.id), name: recipe.name, price: Math.round(150 + (Number(recipe.caloriesPerServing || 200) % 9) * 25), category: categories[index % categories.length], count: `${Math.max(1, Number(recipe.servings || 1)) * 100} г`, image: recipe.image }));
}
function getSavedOrders() { try { return JSON.parse(localStorage.getItem(LAB_STORAGE_PREFIX + 'demo_orders') || '[]'); } catch (e) { return []; } }
function saveOrders() { localStorage.setItem(LAB_STORAGE_PREFIX + 'demo_orders', JSON.stringify(ordersData)); }
function makeSeedOrders(recipes) {
    return recipes.slice(0, 3).map((recipe, index) => {
        const dish = dishesCache.find(item => item.name === recipe.name);
        return { id: 91000 + Number(recipe.id), apiId: Number(recipe.id), created_at: new Date(Date.now() - index * 86400000).toISOString(), full_name: ['Анна Иванова','Иван Петров','Мария Смирнова'][index], email: ['anna@example.com','ivan@example.com','maria@example.com'][index], phone: '+7 (999) 000-00-00', delivery_address: 'г. Москва, демонстрационный адрес', delivery_type: 'now', delivery_time: null, comment: 'Демонстрационный заказ, сформированный из данных DummyJSON.', soup_id: null, main_course_id: dish ? dish.id : null, salad_id: null, drink_id: null, dessert_id: null, demo: true, seeded: true };
    });
}
async function loadData() {
    const container = document.getElementById('orders-container'); container.innerHTML = '<p>Загрузка заказов...</p>';
    try {
        if (!API_KEY || API_KEY === 'КЛЮЧ' || API_KEY === 'ТВОЙ_UUID_КЛЮЧ_ЗДЕСЬ') throw new Error('Ключ API Мосполитеха не задан');
        const [dishesResponse, ordersResponse] = await Promise.all([fetch(`${BASE_URL}/dishes`), fetch(`${BASE_URL}/orders?api_key=${encodeURIComponent(API_KEY)}`)]);
        if (!dishesResponse.ok || !ordersResponse.ok) throw new Error('Основной API вернул ошибку');
        const [dishes, orders] = await Promise.all([dishesResponse.json(), ordersResponse.json()]);
        if (!Array.isArray(dishes) || !Array.isArray(orders)) throw new Error('Некорректный ответ основного API');
        dishesCache = dishes; ordersData = orders.sort((a,b) => new Date(b.created_at)-new Date(a.created_at)); dataSource = 'mospolytech';
        showApiStatus('primary', 'Основной источник: API Мосполитеха. Заказы и блюда загружены с сервера.'); renderTable();
    } catch (error) {
        console.warn('Основной API недоступен, включаем DummyJSON:', error);
        try {
            const response = await fetch(`${DEMO_API}/recipes?limit=30`); if (!response.ok) throw new Error(`DummyJSON HTTP ${response.status}`);
            const result = await response.json(); if (!Array.isArray(result.recipes) || !result.recipes.length) throw new Error('DummyJSON вернул пустой список');
            dishesCache = mapDummyRecipes(result.recipes); dataSource = 'dummyjson';
            const saved = getSavedOrders();
            ordersData = saved.length ? saved : makeSeedOrders(result.recipes);
            if (!saved.length) saveOrders();
            showApiStatus('demo', 'Демо-режим: каталог получен GET-запросом DummyJSON. История заказов хранится локально; создание, изменение и удаление дополнительно отправляют POST/PUT/DELETE-запросы DummyJSON.');
            renderTable();
        } catch (demoError) { container.innerHTML = `<p style="color:#a12622;padding:20px">Не удалось загрузить данные: ${escapeHtml(demoError.message)}</p>`; showApiStatus('error', 'Основной API и резервный DummyJSON сейчас недоступны.'); }
    }
}
function renderTable() {
    const container = document.getElementById('orders-container');
    if (!ordersData.length) { container.innerHTML = '<p style="padding:20px;font-weight:400">У вас пока нет заказов.</p>'; return; }
    let html = `<table class="orders-table"><thead><tr><th>№</th><th>Дата оформления</th><th>Состав заказа</th><th>Стоимость</th><th>Время доставки</th><th>Действия</th></tr></thead><tbody>`;
    ordersData.forEach((order,index) => {
        let names = [], total = 0;
        [order.soup_id,order.main_course_id,order.salad_id,order.drink_id,order.dessert_id].forEach(id => { if (id) { const dish = dishesCache.find(item => Number(item.id) === Number(id)); if (dish) { names.push(dish.name); total += Number(dish.price)||0; } } });
        const delivery = order.delivery_type === 'now' ? 'Как можно скорее<br><span style="font-size:12px;color:#888">(с 07:00 до 23:00)</span>' : escapeHtml(order.delivery_time || '');
        html += `<tr><td>${index+1}</td><td>${escapeHtml(formatDate(order.created_at))}</td><td>${escapeHtml(names.join(', ') || 'Состав не указан')}</td><td>${total}₽</td><td>${delivery}</td><td class="actions"><span class="action-icon" onclick="openView(${Number(order.id)})" title="Подробнее">👁️</span><span class="action-icon" onclick="openEdit(${Number(order.id)})" title="Редактирование">✏️</span><span class="action-icon" onclick="openDelete(${Number(order.id)})" title="Удаление">🗑️</span></td></tr>`;
    });
    container.innerHTML = html + '</tbody></table>';
}
function closeModal(id) { const modal = document.getElementById(id); if (modal) modal.style.display = 'none'; }
function openView(orderId) {
    const order = ordersData.find(item => Number(item.id) === Number(orderId)); if (!order) return;
    const labels = [['soup_id','Суп'],['main_course_id','Основное блюдо'],['salad_id','Салат'],['drink_id','Напиток'],['dessert_id','Десерт']]; let total=0, dishesHtml='';
    labels.forEach(([field,label]) => { if (order[field]) { const dish = dishesCache.find(item => Number(item.id) === Number(order[field])); if (dish) { total += Number(dish.price)||0; dishesHtml += `<div class="view-row"><span>${label}</span><span>${escapeHtml(dish.name)} (${dish.price}₽)</span></div>`; } } });
    document.getElementById('view-content').innerHTML = `<div class="view-row"><span>Дата оформления</span><span>${escapeHtml(formatDate(order.created_at))}</span></div><h4>Доставка</h4><div class="view-row"><span>Имя получателя</span><span>${escapeHtml(order.full_name)}</span></div><div class="view-row"><span>Адрес доставки</span><span>${escapeHtml(order.delivery_address)}</span></div><div class="view-row"><span>Время доставки</span><span>${order.delivery_type==='now'?'Как можно скорее':escapeHtml(order.delivery_time)}</span></div><div class="view-row"><span>Телефон</span><span>${escapeHtml(order.phone)}</span></div><div class="view-row"><span>Email</span><span>${escapeHtml(order.email)}</span></div><h4>Комментарий</h4><p>${escapeHtml(order.comment || 'Нет комментария')}</p><h4>Состав заказа</h4>${dishesHtml || '<p>Не указан</p>'}<div class="view-row"><strong>Стоимость:</strong><strong>${total}₽</strong></div>`;
    document.getElementById('modal-view').style.display = 'flex';
}
function openEdit(orderId) {
    const order = ordersData.find(item => Number(item.id) === Number(orderId)); if (!order) return;
    document.getElementById('edit-id').value = order.id; document.getElementById('edit-name').value = order.full_name || ''; document.getElementById('edit-address').value = order.delivery_address || ''; document.getElementById('edit-phone').value = order.phone || ''; document.getElementById('edit-email').value = order.email || ''; document.getElementById('edit-comment').value = order.comment || '';
    const now = document.querySelector('input[name="edit-delivery_type"][value="now"]'), byTime = document.querySelector('input[name="edit-delivery_type"][value="by_time"]'), time = document.getElementById('edit-time');
    if (order.delivery_type === 'by_time') { byTime.checked = true; time.disabled = false; time.value = order.delivery_time || ''; } else { now.checked = true; time.disabled = true; time.value = ''; }
    document.querySelectorAll('input[name="edit-delivery_type"]').forEach(radio => radio.onchange = () => { time.disabled = !byTime.checked; if (now.checked) time.value = ''; });
    document.getElementById('modal-edit').style.display = 'flex';
}
async function saveEdit() {
    const id = Number(document.getElementById('edit-id').value), order = ordersData.find(item => Number(item.id) === id); if (!order) return;
    const type = document.querySelector('input[name="edit-delivery_type"]:checked')?.value, time = document.getElementById('edit-time').value;
    if (type === 'by_time' && !time) { alert('Укажите время доставки'); return; }
    const updated = { full_name:document.getElementById('edit-name').value, email:document.getElementById('edit-email').value, phone:document.getElementById('edit-phone').value, delivery_address:document.getElementById('edit-address').value, delivery_type:type, delivery_time:type==='by_time'?time:null, comment:document.getElementById('edit-comment').value };
    if (dataSource === 'dummyjson') {
        try { const response = await fetch(`${DEMO_API}/posts/${Number(order.apiId || 1)}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ title:`Заказ Food Construct: ${updated.full_name}`, body:JSON.stringify(updated), userId:1 }) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); await response.json(); }
        catch (error) { console.warn('DummyJSON PUT не выполнен, сохраняем локально:', error); }
        Object.assign(order, updated); saveOrders(); alert('Заказ изменён. Изменения сохранены в браузере; PUT-запрос DummyJSON отправлен (сервер имитирует обновление).');
    } else {
        try { const response = await fetch(`${BASE_URL}/orders/${id}?api_key=${encodeURIComponent(API_KEY)}`, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)}); if (!response.ok) throw new Error(`HTTP ${response.status}`); alert('Заказ успешно изменён на сервере.'); }
        catch (error) { alert('Не удалось изменить заказ: '+error.message); return; }
    }
    closeModal('modal-edit'); renderTable();
}
function openDelete(orderId) { orderToDelete = Number(orderId); document.getElementById('modal-delete').style.display = 'flex'; }
async function confirmDelete() {
    if (orderToDelete === null) return; const order = ordersData.find(item => Number(item.id) === Number(orderToDelete)); if (!order) return;
    if (dataSource === 'dummyjson') {
        try { const response = await fetch(`${DEMO_API}/posts/${Number(order.apiId || 1)}`, {method:'DELETE'}); if (!response.ok) throw new Error(`HTTP ${response.status}`); await response.json(); }
        catch (error) { console.warn('DummyJSON DELETE не выполнен, удаляем локальную запись:', error); }
        ordersData = ordersData.filter(item => Number(item.id) !== Number(orderToDelete)); saveOrders(); alert('Заказ удалён из локальной истории; DELETE-запрос DummyJSON отправлен (сервер имитирует удаление).');
    } else {
        try { const response = await fetch(`${BASE_URL}/orders/${orderToDelete}?api_key=${encodeURIComponent(API_KEY)}`, {method:'DELETE'}); if (!response.ok) throw new Error(`HTTP ${response.status}`); ordersData = ordersData.filter(item => Number(item.id) !== Number(orderToDelete)); alert('Заказ успешно удалён.'); }
        catch (error) { alert('Не удалось удалить заказ: '+error.message); return; }
    }
    orderToDelete = null; closeModal('modal-delete'); renderTable();
}
document.addEventListener('DOMContentLoaded', loadData);

const API_KEY = 'ТВОЙ_UUID_КЛЮЧ_ЗДЕСЬ';
const BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/labs/api';
const DEMO_API = 'https://dummyjson.com';
const LAB_STORAGE_PREFIX = 'lab9';

let dishes = [];
let selected = { soup: null, main: null, salad: null, drink: null, dessert: null };
let dataSource = 'loading';
const categoryNames = { soup: 'Суп', main: 'Главное блюдо', salad: 'Салат/стартер', drink: 'Напиток', dessert: 'Десерт' };
const emptyTexts = { soup: 'Не выбран', main: 'Не выбрано', salad: 'Не выбран', drink: 'Не выбран', dessert: 'Не выбран' };

function getCart() { try { return JSON.parse(localStorage.getItem(LAB_STORAGE_PREFIX + 'cart') || '{}'); } catch (e) { return {}; } }
function saveCart(cart) { localStorage.setItem(LAB_STORAGE_PREFIX + 'cart', JSON.stringify(cart)); }
function hasRealApiKey() { return API_KEY && !['КЛЮЧ', 'ТВОЙ_UUID_КЛЮЧ_ЗДЕСЬ'].includes(API_KEY); }
function showApiStatus(mode, message) {
    const main = document.querySelector('main'); if (!main) return;
    let box = document.getElementById('api-status');
    if (!box) { box = document.createElement('div'); box.id = 'api-status'; box.style.cssText = 'margin:16px auto;padding:11px 16px;max-width:1100px;border-radius:10px;font-size:13px;font-weight:600;line-height:1.5;'; main.prepend(box); }
    box.style.background = mode === 'demo' ? '#fff3e0' : mode === 'error' ? '#fdecea' : '#e9f7ef';
    box.style.color = mode === 'demo' ? '#9a4d12' : mode === 'error' ? '#a12622' : '#216b42';
    box.textContent = message;
}
function mapDummyRecipes(recipes) {
    const categories = ['soup', 'main', 'salad', 'drink', 'dessert'];
    return recipes.map((recipe, index) => ({ id: 9000 + Number(recipe.id), name: recipe.name, price: Math.round(150 + (Number(recipe.caloriesPerServing || 200) % 9) * 25), category: categories[index % categories.length], count: `${Math.max(1, Number(recipe.servings || 1)) * 100} г`, image: recipe.image }));
}
async function loadDishes() {
    try {
        const response = await fetch(`${BASE_URL}/dishes`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data) || !data.length) throw new Error('Некорректный ответ API');
        dishes = data; dataSource = 'mospolytech';
        showApiStatus('primary', 'Основной источник: API Мосполитеха. Список блюд получен с сервера.');
    } catch (error) {
        try {
            const response = await fetch(`${DEMO_API}/recipes?limit=30`);
            if (!response.ok) throw new Error(`DummyJSON HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data.recipes) || !data.recipes.length) throw new Error('Пустой ответ DummyJSON');
            dishes = mapDummyRecipes(data.recipes); dataSource = 'dummyjson';
            showApiStatus('demo', 'Демо-режим: блюда загружены через GET DummyJSON. Оформление заказа будет отправлено через POST DummyJSON, а запись сохранится в браузере.');
        } catch (demoError) {
            showApiStatus('error', 'Не удалось загрузить меню. Проверьте подключение к интернету.'); console.error(demoError); return;
        }
    }
    restoreSelectionFromCart(); renderComposition(); renderSummary(); setupForm();
}
function restoreSelectionFromCart() {
    const cart = getCart();
    for (const category in cart) { const found = dishes.find(d => Number(d.id) === Number(cart[category])); if (found && selected[category] !== undefined) selected[category] = found; }
}
function renderComposition() {
    const container = document.getElementById('order-composition'); const emptyMsg = document.getElementById('empty-cart-message');
    if (!container || !emptyMsg) return; container.innerHTML = '';
    const chosen = Object.entries(selected).filter(([, dish]) => dish);
    if (!chosen.length) { emptyMsg.style.display = 'block'; return; }
    emptyMsg.style.display = 'none';
    chosen.forEach(([category, dish]) => {
        const card = document.createElement('div'); card.className = 'dish'; card.dataset.dish = dish.id;
        const img = document.createElement('img'); img.src = dish.image || 'img/foodontable.png'; img.alt = dish.name;
        const price = document.createElement('p'); price.className = 'price'; price.textContent = `${dish.price}₽`;
        const name = document.createElement('p'); name.className = 'name'; name.textContent = dish.name;
        const weight = document.createElement('p'); weight.className = 'weight'; weight.textContent = dish.count || '';
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Удалить'; button.addEventListener('click', () => removeDish(category));
        card.append(img, price, name, weight, button); container.appendChild(card);
    });
}
function removeDish(category) { const cart = getCart(); delete cart[category]; saveCart(cart); selected[category] = null; renderComposition(); renderSummary(); }
function renderSummary() {
    const summary = document.getElementById('order-summary'); if (!summary) return;
    let total = 0; const fragment = document.createDocumentFragment();
    Object.keys(categoryNames).forEach(category => {
        const block = document.createElement('div'); block.className = 'order-category';
        const title = document.createElement('p'); title.className = 'order-category-title'; title.textContent = categoryNames[category];
        const line = document.createElement('p'); line.className = 'order-dish';
        if (selected[category]) { line.textContent = `${selected[category].name} ${selected[category].price}₽`; total += Number(selected[category].price) || 0; }
        else { line.classList.add('empty'); line.textContent = emptyTexts[category]; }
        block.append(title, line); fragment.appendChild(block);
    });
    const totalBlock = document.createElement('div'); totalBlock.className = 'order-total';
    const totalTitle = document.createElement('p'); totalTitle.className = 'order-category-title'; totalTitle.textContent = 'Стоимость заказа';
    const totalPrice = document.createElement('p'); totalPrice.className = 'order-total-price'; totalPrice.textContent = `${total}₽`;
    totalBlock.append(totalTitle, totalPrice); fragment.appendChild(totalBlock); summary.replaceChildren(fragment);
}
function validateLunch() {
    const hasSoup = !!selected.soup, hasMain = !!selected.main, hasSalad = !!selected.salad, hasDrink = !!selected.drink;
    if (!(hasSoup || hasMain || hasSalad || hasDrink)) return 'Ничего не выбрано. Выберите блюда для заказа';
    if (!hasSoup && !hasMain && !hasSalad) return 'Выберите главное блюдо';
    if (hasSalad && !hasSoup && !hasMain) return 'Выберите суп или главное блюдо';
    if (hasSoup && !hasMain && !hasSalad) return 'Выберите главное блюдо/салат/стартер';
    if (!hasDrink) return 'Выберите напиток';
    return null;
}
function setupForm() {
    const form = document.getElementById('checkout-form'); if (!form || form.dataset.initialized) return; form.dataset.initialized = 'true';
    const deliveryTime = document.getElementById('delivery-time');
    const radioFast = document.querySelector('input[name="delivery_type"][value="now"]');
    const radioTime = document.querySelector('input[name="delivery_type"][value="by_time"]');
    function syncDeliveryTime() { deliveryTime.disabled = !radioTime.checked; if (radioFast.checked) deliveryTime.value = ''; }
    radioFast.addEventListener('change', syncDeliveryTime); radioTime.addEventListener('change', syncDeliveryTime); syncDeliveryTime();
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const error = validateLunch(); if (error) { alert(error); return; }
        if (!form.reportValidity()) return;
        if (radioTime.checked && !deliveryTime.value) { alert('Укажите время доставки'); return; }
        const formData = new FormData(form);
        const orderData = {
            full_name: formData.get('name'), email: formData.get('email'), subscribe: formData.get('subscribe') ? 1 : 0,
            phone: formData.get('phone'), delivery_address: formData.get('delivery_address'), delivery_type: formData.get('delivery_type'),
            comment: formData.get('comment') || '', soup_id: selected.soup?.id ?? null, main_course_id: selected.main?.id ?? null,
            salad_id: selected.salad?.id ?? null, drink_id: selected.drink?.id ?? null, dessert_id: selected.dessert?.id ?? null
        };
        if (orderData.delivery_type === 'by_time') orderData.delivery_time = formData.get('delivery_time');
        try {
            if (hasRealApiKey()) {
                const response = await fetch(`${BASE_URL}/orders?api_key=${encodeURIComponent(API_KEY)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
                if (!response.ok) throw new Error(`API Мосполитеха: HTTP ${response.status}`);
                localStorage.removeItem(LAB_STORAGE_PREFIX + 'cart');
                alert('Заказ успешно оформлен через API Мосполитеха.'); window.location.href = 'index.html'; return;
            }
            throw new Error('Ключ API Мосполитеха не задан — включён резервный режим.');
        } catch (primaryError) {
            console.warn(primaryError);
            try {
                const response = await fetch(`${DEMO_API}/posts/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Заказ Food Construct: ${orderData.full_name}`, body: JSON.stringify(orderData), userId: 1 }) });
                if (!response.ok) throw new Error(`DummyJSON HTTP ${response.status}`);
                const apiResult = await response.json();
                const storageKey = LAB_STORAGE_PREFIX + 'demo_orders';
                const savedOrders = JSON.parse(localStorage.getItem(storageKey) || '[]');
                savedOrders.unshift({ ...orderData, id: Date.now(), apiId: apiResult.id, created_at: new Date().toISOString(), demo: true });
                localStorage.setItem(storageKey, JSON.stringify(savedOrders));
                localStorage.removeItem(LAB_STORAGE_PREFIX + 'cart');
                showApiStatus('demo', 'Заказ отправлен POST-запросом в DummyJSON. DummyJSON имитирует создание записи; копия заказа сохранена в localStorage для демонстрации.');
                alert('Заказ оформлен в демонстрационном режиме. Запрос POST к DummyJSON выполнен, заказ сохранён в этом браузере.');
                window.location.href = 'index.html';
            } catch (demoError) {
                alert('Не удалось отправить заказ через резервный API: ' + demoError.message);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', loadDishes);

// API Мосполитеха используется как основной источник. При недоступности — DummyJSON.
const API_KEY = 'КЛЮЧ';
const BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/labs/api';
const DEMO_API_URL = 'https://dummyjson.com/recipes?limit=30';
const LAB_STORAGE_PREFIX = 'lab8';

let dishes = [];
let dataSource = 'loading';
let selected = { soup: null, main: null, salad: null, drink: null, dessert: null };

function getCart() {
    try { return JSON.parse(localStorage.getItem(LAB_STORAGE_PREFIX + 'cart') || '{}'); }
    catch (error) { return {}; }
}
function saveCart(cart) { localStorage.setItem(LAB_STORAGE_PREFIX + 'cart', JSON.stringify(cart)); }

function showApiStatus(mode, message) {
    const main = document.querySelector('main');
    if (!main) return;
    let box = document.getElementById('api-status');
    if (!box) {
        box = document.createElement('div');
        box.id = 'api-status';
        box.style.cssText = 'margin:16px auto;padding:11px 16px;max-width:1100px;border-radius:10px;font-size:13px;font-weight:600;line-height:1.5;';
        main.prepend(box);
    }
    const isDemo = mode === 'demo';
    box.style.background = isDemo ? '#fff3e0' : '#e9f7ef';
    box.style.color = isDemo ? '#9a4d12' : '#216b42';
    box.textContent = message || (isDemo ? 'Демо-режим: данные получены из DummyJSON.' : 'Основной API Мосполитеха подключён.');
}

function mapDummyRecipes(recipes) {
    const categories = ['soup', 'main', 'salad', 'drink', 'dessert'];
    return recipes.map((recipe, index) => ({
        id: 9000 + Number(recipe.id),
        keyword: `dummy-${recipe.id}`,
        name: recipe.name,
        price: Math.round(150 + (Number(recipe.caloriesPerServing || 200) % 9) * 25),
        category: categories[index % categories.length],
        kind: (recipe.tags || []).some(tag => /seafood|fish/i.test(tag)) ? 'fish' : ((recipe.tags || []).some(tag => /meat|chicken|beef|pork/i.test(tag)) ? 'meat' : 'vegetarian'),
        temperature: categories[index % categories.length] === 'drink' ? 'cold' : undefined,
        portion: categories[index % categories.length] === 'dessert' ? 'medium' : undefined,
        count: `${Math.max(1, Number(recipe.servings || 1)) * 100} г`,
        image: recipe.image,
        source: 'DummyJSON'
    }));
}

async function loadDishes() {
    try {
        const response = await fetch(`${BASE_URL}/dishes`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('Пустой или некорректный ответ API');
        dishes = data;
        dataSource = 'mospolytech';
        showApiStatus('primary', 'Основной источник: API Мосполитеха. Меню загружено с сервера.');
    } catch (error) {
        console.warn('Основной API недоступен, переключаемся на DummyJSON:', error);
        try {
            const response = await fetch(DEMO_API_URL);
            if (!response.ok) throw new Error(`DummyJSON HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data.recipes) || data.recipes.length === 0) throw new Error('DummyJSON вернул пустой список');
            dishes = mapDummyRecipes(data.recipes);
            dataSource = 'dummyjson';
            showApiStatus('demo', 'Демо-режим: меню загружено реальным GET-запросом к DummyJSON. Заказы в этом режиме сохраняются в браузере.');
        } catch (demoError) {
            showApiStatus('error', 'Не удалось загрузить меню ни с основного API, ни с DummyJSON. Проверьте подключение к интернету.');
            console.error(demoError);
            return;
        }
    }
    restoreSelectionFromCart();
    renderDishes();
}

function restoreSelectionFromCart() {
    const cart = getCart();
    for (const category in cart) {
        const foundDish = dishes.find(d => Number(d.id) === Number(cart[category]));
        if (foundDish && Object.prototype.hasOwnProperty.call(selected, category)) selected[category] = foundDish;
    }
}

function renderDishes() {
    const containers = {
        soup: document.getElementById('soup-container'),
        main: document.getElementById('main-container'),
        salad: document.getElementById('salad-container'),
        drink: document.getElementById('drink-container'),
        dessert: document.getElementById('dessert-container')
    };
    Object.values(containers).forEach(container => { if (container) container.innerHTML = ''; });
    [...dishes].sort((a, b) => a.name.localeCompare(b.name, 'ru')).forEach(dish => {
        const container = containers[dish.category];
        if (!container) return;
        const isSelected = Number(selected[dish.category]?.id) === Number(dish.id);
        const card = document.createElement('div');
        card.className = `dish ${isSelected ? 'selected' : ''}`;
        card.dataset.dish = dish.id;
        const image = document.createElement('img');
        image.src = dish.image || 'img/foodontable.png';
        image.alt = dish.name;
        image.loading = 'lazy';
        const price = document.createElement('p'); price.className = 'price'; price.textContent = `${dish.price}₽`;
        const name = document.createElement('p'); name.className = 'name'; name.textContent = dish.name;
        const weight = document.createElement('p'); weight.className = 'weight'; weight.textContent = dish.count || '';
        const button = document.createElement('button'); button.type = 'button'; button.textContent = isSelected ? 'Удалить' : 'Добавить';
        button.addEventListener('click', () => toggleDish(dish.id, dish.category));
        card.append(image, price, name, weight, button);
        container.appendChild(card);
    });
    updatePanel();
}

function toggleDish(dishId, category) {
    const cart = getCart();
    if (Number(cart[category]) === Number(dishId)) { delete cart[category]; selected[category] = null; }
    else { cart[category] = Number(dishId); selected[category] = dishes.find(d => Number(d.id) === Number(dishId)) || null; }
    saveCart(cart);
    renderDishes();
}

function updatePanel() {
    const panel = document.getElementById('checkout-panel');
    const totalSpan = document.getElementById('panel-total');
    const link = document.getElementById('checkout-link');
    if (!panel || !totalSpan || !link) return;
    let total = 0;
    let hasAny = false;
    Object.values(selected).forEach(dish => { if (dish) { hasAny = true; total += Number(dish.price) || 0; } });
    if (!hasAny) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    totalSpan.textContent = total;
    const error = validateLunch();
    if (error) { link.classList.add('disabled'); link.removeAttribute('href'); link.title = error; }
    else { link.classList.remove('disabled'); link.href = 'order.html'; link.removeAttribute('title'); }
}

function validateLunch() {
    const hasSoup = !!selected.soup, hasMain = !!selected.main, hasSalad = !!selected.salad, hasDrink = !!selected.drink;
    const anything = hasSoup || hasMain || hasSalad || hasDrink;
    if (!anything) return 'Ничего не выбрано';
    if (!hasSoup && !hasMain && !hasSalad) return 'Выберите главное блюдо';
    if (hasSalad && !hasSoup && !hasMain) return 'Выберите суп или главное блюдо';
    if (hasSoup && !hasMain && !hasSalad) return 'Выберите главное блюдо/салат/стартер';
    if (!hasDrink) return 'Выберите напиток';
    return null;
}

document.addEventListener('DOMContentLoaded', loadDishes);


// Фильтрация блюд по типу, температуре напитка и размеру десерта.
const activeDishFilters = {};

function normalizeFilterText(value) {
    return String(value ?? '').toLowerCase().replaceAll('ё', 'е').trim();
}

function getDishFilterValue(dish, category) {
    const rawKind = normalizeFilterText(dish.kind || dish.type || dish.foodType || dish.kind_name || dish.dish_type || '');
    const rawTemperature = normalizeFilterText(dish.temperature || dish.drink_type || dish.serving_temperature || '');
    const rawPortion = normalizeFilterText(dish.portion || dish.portionSize || dish.size || dish.size_name || '');
    const name = normalizeFilterText(dish.name || dish.title || '');
    const description = normalizeFilterText(dish.description || '');
    const text = `${name} ${description} ${rawKind}`;

    if (category === 'drink') {
        if (/hot|горяч|тепл/.test(rawTemperature)) return 'hot';
        if (/cold|холод|ледян/.test(rawTemperature)) return 'cold';
        if (/coffee|кафе|капучино|латте|чай|tea|эспрессо/.test(text)) return 'hot';
        return 'cold';
    }
    if (category === 'dessert') {
        if (/small|маленьк|небольш/.test(rawPortion)) return 'small';
        if (/medium|средн/.test(rawPortion)) return 'medium';
        if (/large|больш/.test(rawPortion)) return 'large';
        const weightText = String(dish.count || dish.weight || dish.portion_weight || '');
        const weight = Number((weightText.match(/[0-9]+(?:[.,][0-9]+)?/) || [])[0]?.replace(',', '.') || 0);
        if (weight > 0) return weight <= 150 ? 'small' : (weight <= 400 ? 'medium' : 'large');
        return 'medium';
    }

    if (/fish|рыб|seafood|морепродукт|кревет|лосос|тунц|краб|треск|форел/.test(rawKind + ' ' + text)) return 'fish';
    if (/meat|мяс|chicken|куриц|говядин|свин|индей|бекон|ветчин|котлет|фарш/.test(rawKind + ' ' + text)) return 'meat';
    if (/vegetarian|вегет|vegan|овощ|гриб|сыр|томат|греческ/.test(rawKind + ' ' + text)) return 'vegetarian';
    // Если API не передал тип блюда, не скрываем блюдо: относим его к вегетарианским,
    // если в названии не обнаружены признаки рыбы или мяса.
    return 'vegetarian';
}

function applyDishFilter(category) {
    const container = document.getElementById(`${category}-container`);
    if (!container) return;
    const filter = activeDishFilters[category];
    [...container.querySelectorAll('.dish')].forEach(card => {
        const dishId = card.dataset.dish;
        const dish = dishes.find(item => String(item.id ?? item.keyword) === String(dishId));
        card.hidden = !!filter && !!dish && getDishFilterValue(dish, category) !== filter;
    });
}

function initializeDishFilters() {
    document.querySelectorAll('.dish-filters').forEach(group => {
        const category = group.dataset.filterFor;
        group.querySelectorAll('.filter-button').forEach(button => {
            button.addEventListener('click', () => {
                const next = button.dataset.filter;
                activeDishFilters[category] = activeDishFilters[category] === next ? null : next;
                group.querySelectorAll('.filter-button').forEach(item => {
                    const isActive = item.dataset.filter === activeDishFilters[category];
                    item.classList.toggle('active', isActive);
                    item.setAttribute('aria-pressed', String(isActive));
                });
                applyDishFilter(category);
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', initializeDishFilters);

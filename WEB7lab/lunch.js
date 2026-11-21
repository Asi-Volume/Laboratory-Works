let dishes = [];
const DEMO_API_URL = 'https://dummyjson.com/recipes?limit=30';

async function loadDishes() {
    try {
        const response = await fetch(DEMO_API_URL);

        if (!response.ok) {
            throw new Error(`Ошибка DummyJSON: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data.recipes) || data.recipes.length === 0) {
            throw new Error('Список блюд пуст');
        }

        dishes = mapDummyRecipes(data.recipes);

        renderDishes();

    } catch (error) {
        console.error('Ошибка загрузки блюд:', error);
        alert('Не удалось загрузить блюда. Проверьте подключение к интернету.');
    }
}

function mapDummyRecipes(recipes) {
    const categories = ['soup', 'main', 'salad', 'drink', 'dessert'];

    return recipes.map((recipe, index) => ({
        id: 9000 + Number(recipe.id),
        keyword: `dummy-${recipe.id}`,
        name: recipe.name,
        price: Math.round(150 + (Number(recipe.caloriesPerServing || 200) % 9) * 25),
        category: categories[index % categories.length],
        count: `${Math.max(1, Number(recipe.servings || 1)) * 100} г`,
        image: recipe.image
    }));
}


function renderDishes() {
    const containers = {
        soup: document.getElementById('soup-container'),
        main: document.getElementById('main-container'),
        salad: document.getElementById('salad-container'),
        drink: document.getElementById('drink-container'),
        dessert: document.getElementById('dessert-container')
    };

    Object.values(containers).forEach(c => {
        if (c) c.innerHTML = '';
    });

    const sortedDishes = [...dishes].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    sortedDishes.forEach(dish => {
        const container = containers[dish.category];
        if (!container) return;

        const card = document.createElement('div');
        card.className = 'dish';
        card.setAttribute('data-dish', dish.keyword);

        card.innerHTML = `
            <img src="${dish.image}" alt="${dish.name}">
            <p class="price">${dish.price}₽</p>
            <p class="name">${dish.name}</p>
            <p class="weight">${dish.count}</p>
            <button type="button">Добавить</button>
        `;

        card.querySelector('button').addEventListener('click', () => selectDish(dish.keyword));
        container.appendChild(card);
    });
}

const selected = {
    soup: null,
    main: null,
    salad: null,
    drink: null,
    dessert: null
};

const categoryNames = {
    soup: 'Суп',
    main: 'Главное блюдо',
    salad: 'Салат',
    drink: 'Напиток',
    dessert: 'Десерт'
};

const emptyTexts = {
    soup: 'Блюдо не выбрано',
    main: 'Блюдо не выбрано',
    salad: 'Блюдо не выбрано',
    drink: 'Напиток не выбран',
    dessert: 'Десерт не выбран'
};

function selectDish(keyword) {
    const dish = dishes.find(d => d.keyword === keyword);
    if (!dish) return;

    selected[dish.category] = dish;

    document.querySelectorAll('.dish').forEach(card => card.classList.remove('selected'));
    const card = document.querySelector(`.dish[data-dish="${keyword}"]`);
    if (card) card.classList.add('selected');

    document.getElementById('hidden-soup').value = selected.soup ? selected.soup.keyword : '';
    document.getElementById('hidden-main').value = selected.main ? selected.main.keyword : '';
    document.getElementById('hidden-salad').value = selected.salad ? selected.salad.keyword : '';
    document.getElementById('hidden-drink').value = selected.drink ? selected.drink.keyword : '';
    document.getElementById('hidden-dessert').value = selected.dessert ? selected.dessert.keyword : '';

    updateOrderSummary();
}

function updateOrderSummary() {
    const summary = document.getElementById('order-summary');
    const hasAny = selected.soup || selected.main || selected.salad || selected.drink || selected.dessert;

    if (!hasAny) {
        summary.innerHTML = '<p class="order-empty">Ничего не выбрано</p>';
        return;
    }

    let html = '';
    let total = 0;

    ['soup', 'main', 'salad', 'drink', 'dessert'].forEach(cat => {
        const dish = selected[cat];
        html += `<div class="order-category">`;
        html += `<p class="order-category-title">${categoryNames[cat]}</p>`;

        if (dish) {
            html += `<p class="order-dish">${dish.name} ${dish.price}₽</p>`;
            total += dish.price;
        } else {
            html += `<p class="order-dish empty">${emptyTexts[cat]}</p>`;
        }
        html += `</div>`;
    });

    if (total > 0) {
        html += `<div class="order-total">`;
        html += `<p class="order-category-title">Стоимость заказа</p>`;
        html += `<p class="order-total-price">${total}₽</p>`;
        html += `</div>`;
    }

    summary.innerHTML = html;
}

function validateLunch() {
    const hasSoup = !!selected.soup;
    const hasMain = !!selected.main;
    const hasSalad = !!selected.salad;
    const hasDrink = !!selected.drink;
    const hasDessert = !!selected.dessert;

    const anything = hasSoup || hasMain || hasSalad || hasDrink || hasDessert;

    if (!anything) {
        return 'Ничего не выбрано. Выберите блюда для заказа';
    }

    if (!hasSoup && !hasMain && !hasSalad) {
        return 'Выберите главное блюдо';
    }

    if (hasSalad && !hasSoup && !hasMain) {
        return 'Выберите суп или главное блюдо';
    }

    if (hasSoup && !hasMain && !hasSalad) {
        return 'Выберите главное блюдо/салат/стартер';
    }

    if (!hasDrink) {
        return 'Выберите напиток';
    }

    return null;
}

function showNotification(text) {
    const existing = document.querySelector('.notification-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'notification-overlay';

    const box = document.createElement('div');
    box.className = 'notification';

    const message = document.createElement('p');
    message.className = 'notification-text';
    message.textContent = text;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'notification-button';
    button.textContent = 'Окей 👌';
    button.addEventListener('click', () => overlay.remove());

    box.appendChild(message);
    box.appendChild(button);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('order-form');
    form.addEventListener('submit', (e) => {
        const error = validateLunch();
        if (error) {
            e.preventDefault();
            showNotification(error);
        }
    });

    const deliveryTime = document.getElementById('delivery-time');
    const radioFast = document.querySelector('input[name="delivery"][value="fast"]');
    const radioTime = document.querySelector('input[name="delivery"][value="time"]');

    function syncDeliveryTime() {
        if (radioTime.checked) {
            deliveryTime.disabled = false;
        } else {
            deliveryTime.disabled = true;
            deliveryTime.value = '';
        }
    }

    radioFast.addEventListener('change', syncDeliveryTime);
    radioTime.addEventListener('change', syncDeliveryTime);
    syncDeliveryTime();

    loadDishes();
});

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
        const dish = dishes.find(item => String(item.id) === String(dishId) || String(item.keyword) === String(dishId));
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

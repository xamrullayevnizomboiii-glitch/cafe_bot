const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Premium Dark Mode
function applyTheme() {
    if (tg.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('theme-dark');
        tg.setBackgroundColor('#121212');
        tg.setHeaderColor('#121212');
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.remove('theme-dark');
        tg.setBackgroundColor('#EFE7DA');
        tg.setHeaderColor('#EFE7DA');
    }
}
applyTheme();
tg.onEvent('themeChanged', applyTheme);

function haptic() {
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

let cart = {};
let saved = {};
let userLocation = null;
let currentView = 'main';

// Elements
const foodsList = document.getElementById('foods-list');
const drinksList = document.getElementById('drinks-list');
const saladsList = document.getElementById('salads-list');
const savedList = document.getElementById('saved-list');
const cartItemsContainer = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const totalPriceEl = document.getElementById('total-price');
const cartTotalDiv = document.querySelector('.cart-total');
const orderForm = document.getElementById('order-form');
const locationBtn = document.getElementById('location-btn');

// Navigation
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        haptic();
        const targetId = btn.getAttribute('data-target');
        
        sections.forEach(sec => sec.classList.remove('active'));
        navBtns.forEach(b => b.classList.remove('active'));
        orderForm.style.display = 'none';
        
        document.getElementById(targetId).classList.add('active');
        btn.classList.add('active');
        
        currentView = targetId === 'cart-section' ? 'cart' : 'main';
        window.scrollTo(0, 0);
        updateMainButton();
    });
});

// User Profile
const userProfile = document.getElementById('user-profile');
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    const photoUrl = user.photo_url || 'https://telegram.org/img/t_logo.png';
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    const username = user.username ? `@${user.username}` : '';
    
    userProfile.innerHTML = `
        <img src="${photoUrl}" alt="Avatar" class="user-avatar" onerror="this.src='https://telegram.org/img/t_logo.png'">
        <div class="user-info">
            <div class="user-name">${name}</div>
            <div class="user-username">${username}</div>
        </div>
    `;
    userProfile.style.display = 'flex';
}

function getProductById(id) {
    let found = menuData.foods.find(p => p.id === id);
    if (!found) found = menuData.drinks.find(p => p.id === id);
    if (!found) found = menuData.salads.find(p => p.id === id);
    return found;
}

// Render
function renderProducts(products, container) {
    container.innerHTML = '';
    products.forEach(product => {
        const isSaved = saved[product.id];
        const heartColor = isSaved ? '#E74C3C' : 'var(--text-color)';
        const heartContent = isSaved ? '❤️' : '🤍';

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="like-btn" onclick="toggleSaved('${product.id}')">${heartContent}</div>
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="price">${product.price.toLocaleString()} so'm</p>
            <div class="controls-container" id="controls-${product.id}">
                <!-- Injected via updateProductControls -->
            </div>
        `;
        container.appendChild(div);
        updateProductControls(product.id);
    });
}

function updateProductControls(id) {
    // Update main listings
    const container = document.getElementById(`controls-${id}`);
    if (container) {
        const count = cart[id] ? cart[id].count : 0;
        if (count === 0) {
            container.innerHTML = `<button class="add-btn" onclick="addToCart('${id}')">Qo'shish</button>`;
        } else {
            container.innerHTML = `
                <div class="controls">
                    <button onclick="updateCart('${id}', -1)">-</button>
                    <span>${count}</span>
                    <button onclick="updateCart('${id}', 1)">+</button>
                </div>
            `;
        }
    }
    
    // Update saved listings
    const savedContainer = document.getElementById(`saved-controls-${id}`);
    if (savedContainer) {
        const count = cart[id] ? cart[id].count : 0;
        if (count === 0) {
            savedContainer.innerHTML = `<button class="add-btn" onclick="addToCart('${id}')">Qo'shish</button>`;
        } else {
            savedContainer.innerHTML = `
                <div class="controls">
                    <button onclick="updateCart('${id}', -1)">-</button>
                    <span>${count}</span>
                    <button onclick="updateCart('${id}', 1)">+</button>
                </div>
            `;
        }
    }
}

function renderAll() {
    renderProducts(menuData.foods, foodsList);
    renderProducts(menuData.drinks, drinksList);
    renderProducts(menuData.salads, saladsList);
    renderSaved();
}

function renderSaved() {
    savedList.innerHTML = '';
    const keys = Object.keys(saved);
    if (keys.length === 0) {
        savedList.innerHTML = `<p class="empty-cart" style="grid-column: span 2;">Saqlangan taomlar yo'q</p>`;
        return;
    }
    
    keys.forEach(id => {
        const product = getProductById(id);
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="like-btn" onclick="toggleSaved('${product.id}')">❤️</div>
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="price">${product.price.toLocaleString()} so'm</p>
            <div class="controls-container" id="saved-controls-${product.id}"></div>
        `;
        savedList.appendChild(div);
        updateProductControls(product.id);
    });
}

window.toggleSaved = function(id) {
    haptic();
    if (saved[id]) {
        delete saved[id];
    } else {
        saved[id] = true;
    }
    renderAll();
}

window.addToCart = function(id) {
    haptic();
    updateCart(id, 1, false);
}

window.updateCart = function(id, change, triggerHaptic = true) {
    if (triggerHaptic) haptic();
    const product = getProductById(id);
    if (!product && !cart[id]) return;
    
    if (!cart[id]) {
        cart[id] = { name: product.name, price: product.price, count: 0 };
    }
    
    cart[id].count += change;
    
    if (cart[id].count <= 0) {
        delete cart[id];
    }
    
    updateProductControls(id);
    updateCartUI();
};

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    let totalItems = 0;
    let totalPrice = 0;
    
    const cartKeys = Object.keys(cart);
    
    if (cartKeys.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Savatingiz bo\'sh</p>';
        cartBadge.style.display = 'none';
        cartTotalDiv.style.display = 'none';
    } else {
        cartKeys.forEach(id => {
            const item = cart[id];
            totalItems += item.count;
            totalPrice += item.price * item.count;
            
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.price.toLocaleString()} so'm</p>
                </div>
                <div class="controls-container">
                    <div class="controls">
                        <button onclick="updateCart('${id}', -1)">-</button>
                        <span>${item.count}</span>
                        <button onclick="updateCart('${id}', 1)">+</button>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(div);
        });
        
        cartBadge.textContent = totalItems;
        cartBadge.style.display = 'inline-block';
        
        totalPriceEl.textContent = totalPrice.toLocaleString();
        cartTotalDiv.style.display = 'flex';
    }
    
    updateMainButton();
}

// Telegram MainButton Logic
tg.MainButton.onClick(() => {
    if (currentView === 'cart') {
        document.getElementById('cart-section').classList.remove('active');
        document.getElementById('order-form').style.display = 'block';
        currentView = 'order';
        window.scrollTo(0, 0);
        updateMainButton();
    } else if (currentView === 'order') {
        submitOrder();
    }
});

function updateMainButton() {
    const cartKeys = Object.keys(cart);
    let totalPrice = 0;
    cartKeys.forEach(id => {
        totalPrice += cart[id].price * cart[id].count;
    });

    if (cartKeys.length > 0) {
        if (currentView === 'cart') {
            tg.MainButton.text = `Xarid qilish - ${totalPrice.toLocaleString()} so'm`;
            tg.MainButton.show();
        } else if (currentView === 'order') {
            tg.MainButton.text = `Buyurtma berish`;
            tg.MainButton.show();
        } else {
            tg.MainButton.hide();
        }
    } else {
        tg.MainButton.hide();
    }
}

// Location
locationBtn.addEventListener('click', () => {
    haptic();
    if (navigator.geolocation) {
        document.getElementById('location-status').textContent = 'Joylashuv olinmoqda...';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
                document.getElementById('location-status').textContent = '📍 Joylashuv olindi!';
            },
            (error) => {
                document.getElementById('location-status').textContent = 'Joylashuvni olishda xatolik.';
            }
        );
    }
});

function submitOrder() {
    haptic();
    const name = document.getElementById('name').value;
    const surname = document.getElementById('surname').value;
    const phone = document.getElementById('phone').value;
    
    if (!name || !phone) {
        tg.showAlert("Iltimos, Ism va Telefon raqamini kiriting!");
        return;
    }
    
    const orderItems = Object.keys(cart).map(id => ({
        nomi: cart[id].name, soni: cart[id].count, narxi: cart[id].price
    }));
    
    const totalPrice = Object.values(cart).reduce((sum, item) => sum + (item.price * item.count), 0);
    
    const data = {
        ismi: name, familyasi: surname, telefon: phone, joylashuv: userLocation, buyurtma: orderItems, jami: totalPrice
    };
    
    tg.sendData(JSON.stringify(data));
}

// Init
renderAll();

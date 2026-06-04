const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Set Telegram Native Colors
function setupTheme() {
    if (tg.setHeaderColor) {
        try {
            tg.setHeaderColor('bg_color');
            tg.setBackgroundColor('secondary_bg_color');
        } catch (e) {
            console.error("Theme setup error", e);
        }
    }
}
setupTheme();
tg.onEvent('themeChanged', setupTheme);

// Haptic feedback wrapper
function haptic() {
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

let cart = {};
let userLocation = null;
let currentView = 'main'; // 'main', 'cart', 'order'

// Elements
const sections = document.querySelectorAll('.section');
const navBtns = document.querySelectorAll('.nav-btn');
const cartBadge = document.getElementById('cart-badge');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalBlock = document.getElementById('cart-total-block');
const totalPriceEl = document.getElementById('total-price');

// Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        haptic();
        const targetId = btn.getAttribute('data-target');
        
        // Hide all sections
        sections.forEach(sec => sec.classList.remove('active'));
        navBtns.forEach(b => b.classList.remove('active'));
        
        // Show target
        document.getElementById(targetId).classList.add('active');
        btn.classList.add('active');
        
        if (targetId === 'cart-section') {
            currentView = 'cart';
        } else {
            currentView = 'main';
            document.getElementById('order-form').classList.remove('active');
        }
        
        window.scrollTo(0, 0);
        updateMainButton();
    });
});

// Back to Cart from Order Form
document.getElementById('back-to-cart-btn').addEventListener('click', () => {
    haptic();
    document.getElementById('order-form').classList.remove('active');
    document.getElementById('cart-section').classList.add('active');
    currentView = 'cart';
    updateMainButton();
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

// Render Products
function renderProducts(products, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <div class="card-content">
                <h3>${product.name}</h3>
                <p class="price">${product.price.toLocaleString()} so'm</p>
                <div class="controls-container" id="controls-${product.id}">
                    <!-- Controls injected dynamically -->
                </div>
            </div>
        `;
        container.appendChild(div);
        updateProductControls(product.id);
    });
}

function updateProductControls(id) {
    const container = document.getElementById(`controls-${id}`);
    if (!container) return;
    
    const count = cart[id] ? cart[id].count : 0;
    
    if (count === 0) {
        container.innerHTML = `
            <button class="add-btn" onclick="addToCart('${id}')">Qo'shish ➕</button>
        `;
    } else {
        container.innerHTML = `
            <div class="quantity-controls">
                <button onclick="updateCart('${id}', -1)">-</button>
                <span>${count}</span>
                <button onclick="updateCart('${id}', 1)">+</button>
            </div>
        `;
    }
}

// Data init
renderProducts(menuData.foods, 'foods-list');
renderProducts(menuData.drinks, 'drinks-list');
renderProducts(menuData.salads, 'salads-list');

// Cart Logic
function getProductById(id) {
    let found = menuData.foods.find(p => p.id === id);
    if (!found) found = menuData.drinks.find(p => p.id === id);
    if (!found) found = menuData.salads.find(p => p.id === id);
    return found;
}

window.addToCart = function(id) {
    haptic();
    updateCart(id, 1, false);
};

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
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <div class="empty-icon">🛒</div>
                <p>Savatingiz bo'sh</p>
            </div>
        `;
        cartBadge.style.display = 'none';
        cartTotalBlock.style.display = 'none';
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
                    <div class="quantity-controls">
                        <button onclick="updateCart('${id}', -1)">-</button>
                        <span>${item.count}</span>
                        <button onclick="updateCart('${id}', 1)">+</button>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(div);
        });
        
        cartBadge.textContent = totalItems;
        cartBadge.style.display = 'flex';
        
        totalPriceEl.textContent = `${totalPrice.toLocaleString()} so'm`;
        cartTotalBlock.style.display = 'block';
    }
    
    updateMainButton();
}

// Telegram MainButton Logic
tg.MainButton.onClick(() => {
    if (currentView === 'cart') {
        // Savatdan buyurtmaga o'tish
        document.getElementById('cart-section').classList.remove('active');
        document.getElementById('order-form').classList.add('active');
        currentView = 'order';
        window.scrollTo(0, 0);
        updateMainButton();
    } else if (currentView === 'order') {
        // Buyurtmani yuborish
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
document.getElementById('location-btn').addEventListener('click', () => {
    haptic();
    if (navigator.geolocation) {
        const statusText = document.getElementById('location-status');
        statusText.textContent = 'Joylashuv olinmoqda...';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                statusText.textContent = '📍 Joylashuv muvaffaqiyatli olindi!';
                statusText.style.color = 'var(--button-color)';
            },
            (error) => {
                statusText.textContent = 'Joylashuvni olishda xatolik. Brauzerdan ruxsat bering.';
                statusText.style.color = '#ff3b30';
            }
        );
    }
});

// Submit Order
function submitOrder() {
    haptic();
    const name = document.getElementById('name').value;
    const surname = document.getElementById('surname').value;
    const phone = document.getElementById('phone').value;
    
    if (!name || !phone) {
        tg.showAlert("Iltimos, ism va telefon raqamingizni kiriting!");
        return;
    }
    
    const orderItems = Object.keys(cart).map(id => {
        return {
            nomi: cart[id].name,
            soni: cart[id].count,
            narxi: cart[id].price
        };
    });
    
    const totalPrice = Object.values(cart).reduce((sum, item) => sum + (item.price * item.count), 0);
    
    const data = {
        ismi: name,
        familyasi: surname,
        telefon: phone,
        joylashuv: userLocation,
        buyurtma: orderItems,
        jami: totalPrice
    };
    
    tg.sendData(JSON.stringify(data));
}

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

/* ============================
   TEMA (Light / Dark)
   ============================ */
function applyTheme() {
    if (tg.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('theme-dark');
        try {
            tg.setBackgroundColor('#1A1C23');
            tg.setHeaderColor('#1A1C23');
        } catch (e) {}
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.remove('theme-dark');
        try {
            tg.setBackgroundColor('#C8B99A');
            tg.setHeaderColor('#C8B99A');
        } catch (e) {}
    }
}
applyTheme();
tg.onEvent('themeChanged', applyTheme);

function haptic() {
    try {
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
    } catch (e) {}
}

/* ============================
   GLOBAL O'ZGARUVCHILAR
   ============================ */
let cart = {};
let saved = {};
let userLocation = null;
let currentView = 'main';

/* ============================
   DOM ELEMENTLARI
   ============================ */
const foodsList = document.getElementById('foods-list');
const drinksList = document.getElementById('drinks-list');
const saladsList = document.getElementById('salads-list');
const savedList = document.getElementById('saved-list');
const cartItemsContainer = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const totalPriceEl = document.getElementById('total-price');
const cartTotalBlock = document.getElementById('cart-total-block');
const orderForm = document.getElementById('order-form');
const locationBtn = document.getElementById('location-btn');
const savedOverlay = document.getElementById('saved-overlay');

/* ============================
   NAVIGATSIYA
   ============================ */
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        haptic();
        const targetId = btn.getAttribute('data-target');

        sections.forEach(sec => sec.classList.remove('active'));
        navBtns.forEach(b => b.classList.remove('active'));
        orderForm.style.display = 'none';
        savedOverlay.style.display = 'none';

        document.getElementById(targetId).classList.add('active');
        btn.classList.add('active');

        currentView = targetId === 'cart-section' ? 'cart' : 'main';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        updateMainButton();
    });
});

/* ============================
   SAQLANGANLAR (Savat ichida)
   ============================ */
document.getElementById('open-saved-btn').addEventListener('click', () => {
    haptic();
    document.getElementById('cart-section').classList.remove('active');
    savedOverlay.style.display = 'block';
    savedOverlay.classList.add('active');
    currentView = 'saved';
    renderSaved();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateMainButton();
});

document.getElementById('back-from-saved').addEventListener('click', () => {
    haptic();
    savedOverlay.style.display = 'none';
    savedOverlay.classList.remove('active');
    document.getElementById('cart-section').classList.add('active');
    currentView = 'cart';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateMainButton();
});

/* ============================
   Orqaga (Buyurtma -> Savat)
   ============================ */
document.getElementById('back-to-cart-btn').addEventListener('click', () => {
    haptic();
    orderForm.style.display = 'none';
    document.getElementById('cart-section').classList.add('active');
    currentView = 'cart';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateMainButton();
});

/* ============================
   USER PROFIL
   ============================ */
const userProfile = document.getElementById('user-profile');
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    const photoUrl = user.photo_url || 'https://telegram.org/img/t_logo.png';
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    const username = user.username ? '@' + user.username : '';

    userProfile.innerHTML =
        '<img src="' + photoUrl + '" alt="Avatar" class="user-avatar" onerror="this.src=\'https://telegram.org/img/t_logo.png\'">' +
        '<div class="user-info">' +
            '<div class="user-name">' + name + '</div>' +
            '<div class="user-username">' + username + '</div>' +
        '</div>';
    userProfile.style.display = 'flex';
}

/* ============================
   MAHSULOT TOPISH
   ============================ */
function getProductById(id) {
    let found = menuData.foods.find(p => p.id === id);
    if (!found) found = menuData.drinks.find(p => p.id === id);
    if (!found) found = menuData.salads.find(p => p.id === id);
    return found;
}

/* ============================
   RENDER (Mahsulotlarni chizish)
   ============================ */
function renderProducts(products, container) {
    container.innerHTML = '';
    products.forEach(product => {
        const isSaved = saved[product.id];
        const heartContent = isSaved ? '❤️' : '🤍';

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML =
            '<div class="like-btn" onclick="toggleSaved(\'' + product.id + '\')">' + heartContent + '</div>' +
            '<img src="' + product.image + '" alt="' + product.name + '">' +
            '<h3>' + product.name + '</h3>' +
            '<p class="price">' + product.price.toLocaleString() + ' so\'m</p>' +
            '<div class="controls-container" id="controls-' + product.id + '"></div>';
        container.appendChild(div);
        updateProductControls(product.id);
    });
}

function updateProductControls(id) {
    const count = cart[id] ? cart[id].count : 0;

    // Asosiy sahifadagi kontrol
    const container = document.getElementById('controls-' + id);
    if (container) {
        if (count === 0) {
            container.innerHTML = '<button class="add-btn" onclick="addToCart(\'' + id + '\')">Qo\'shish ➕</button>';
        } else {
            container.innerHTML =
                '<div class="controls">' +
                    '<button onclick="updateCart(\'' + id + '\', -1)">−</button>' +
                    '<span>' + count + '</span>' +
                    '<button onclick="updateCart(\'' + id + '\', 1)">+</button>' +
                '</div>';
        }
    }

    // Saqlanganlar sahifasidagi kontrol
    const savedContainer = document.getElementById('saved-controls-' + id);
    if (savedContainer) {
        if (count === 0) {
            savedContainer.innerHTML = '<button class="add-btn" onclick="addToCart(\'' + id + '\')">Qo\'shish ➕</button>';
        } else {
            savedContainer.innerHTML =
                '<div class="controls">' +
                    '<button onclick="updateCart(\'' + id + '\', -1)">−</button>' +
                    '<span>' + count + '</span>' +
                    '<button onclick="updateCart(\'' + id + '\', 1)">+</button>' +
                '</div>';
        }
    }
}

function renderAll() {
    renderProducts(menuData.foods, foodsList);
    renderProducts(menuData.drinks, drinksList);
    renderProducts(menuData.salads, saladsList);
}

function renderSaved() {
    savedList.innerHTML = '';
    const keys = Object.keys(saved);
    if (keys.length === 0) {
        savedList.innerHTML = '<p class="empty-cart" style="grid-column: span 2;">Saqlangan taomlar yo\'q</p>';
        return;
    }

    keys.forEach(id => {
        const product = getProductById(id);
        if (!product) return;
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML =
            '<div class="like-btn" onclick="toggleSaved(\'' + product.id + '\')">❤️</div>' +
            '<img src="' + product.image + '" alt="' + product.name + '">' +
            '<h3>' + product.name + '</h3>' +
            '<p class="price">' + product.price.toLocaleString() + ' so\'m</p>' +
            '<div class="controls-container" id="saved-controls-' + product.id + '"></div>';
        savedList.appendChild(div);
        updateProductControls(product.id);
    });
}

/* ============================
   SAQLASH (LIKE)
   ============================ */
window.toggleSaved = function (id) {
    haptic();
    if (saved[id]) {
        delete saved[id];
    } else {
        saved[id] = true;
    }
    renderAll();
    if (currentView === 'saved') {
        renderSaved();
    }
};

/* ============================
   SAVAT AMALLARI
   ============================ */
window.addToCart = function (id) {
    haptic();
    updateCart(id, 1, false);
};

window.updateCart = function (id, change, doHaptic) {
    if (doHaptic !== false) haptic();
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
        cartItemsContainer.innerHTML =
            '<div class="empty-cart">' +
                '<div class="empty-icon">🛒</div>' +
                '<p>Savatingiz bo\'sh</p>' +
            '</div>';
        cartBadge.style.display = 'none';
        cartTotalBlock.style.display = 'none';
    } else {
        cartKeys.forEach(id => {
            const item = cart[id];
            totalItems += item.count;
            totalPrice += item.price * item.count;

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML =
                '<div class="cart-item-info">' +
                    '<h4>' + item.name + '</h4>' +
                    '<p>' + (item.price * item.count).toLocaleString() + ' so\'m</p>' +
                '</div>' +
                '<div class="controls-container">' +
                    '<div class="controls">' +
                        '<button onclick="updateCart(\'' + id + '\', -1)">−</button>' +
                        '<span>' + item.count + '</span>' +
                        '<button onclick="updateCart(\'' + id + '\', 1)">+</button>' +
                    '</div>' +
                '</div>';
            cartItemsContainer.appendChild(div);
        });

        cartBadge.textContent = totalItems;
        cartBadge.style.display = 'inline-flex';

        totalPriceEl.textContent = totalPrice.toLocaleString() + ' so\'m';
        cartTotalBlock.style.display = 'block';
    }

    updateMainButton();
}

/* ============================
   TELEGRAM MAINBUTTON
   ============================ */
try {
    tg.MainButton.onClick(() => {
        if (currentView === 'cart') {
            haptic();
            document.getElementById('cart-section').classList.remove('active');
            orderForm.style.display = 'block';
            orderForm.classList.add('active');
            currentView = 'order';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            updateMainButton();
        } else if (currentView === 'order') {
            submitOrder();
        }
    });
} catch (e) {}

function updateMainButton() {
    const cartKeys = Object.keys(cart);
    let totalPrice = 0;
    cartKeys.forEach(id => {
        totalPrice += cart[id].price * cart[id].count;
    });

    try {
        if (cartKeys.length > 0) {
            if (currentView === 'cart') {
                tg.MainButton.text = 'Xarid qilish — ' + totalPrice.toLocaleString() + ' so\'m';
                tg.MainButton.show();
            } else if (currentView === 'order') {
                tg.MainButton.text = 'Buyurtma berish';
                tg.MainButton.show();
            } else {
                tg.MainButton.hide();
            }
        } else {
            tg.MainButton.hide();
        }
    } catch (e) {}
}

/* ============================
   JOYLASHUV
   ============================ */
locationBtn.addEventListener('click', () => {
    haptic();
    if (navigator.geolocation) {
        document.getElementById('location-status').textContent = 'Joylashuv olinmoqda...';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
                document.getElementById('location-status').textContent = '✅ Joylashuv olindi!';
            },
            () => {
                document.getElementById('location-status').textContent = '❌ Joylashuvni olishda xatolik.';
            }
        );
    }
});

/* ============================
   BUYURTMA YUBORISH
   ============================ */
function submitOrder() {
    haptic();
    const name = document.getElementById('name').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!name || !phone) {
        try {
            tg.showAlert('Iltimos, Ism va Telefon raqamini kiriting!');
        } catch (e) {
            alert('Iltimos, Ism va Telefon raqamini kiriting!');
        }
        return;
    }

    const orderItems = Object.keys(cart).map(id => ({
        nomi: cart[id].name,
        soni: cart[id].count,
        narxi: cart[id].price
    }));

    const totalPrice = Object.values(cart).reduce((sum, item) => sum + (item.price * item.count), 0);

    const data = {
        ismi: name,
        familyasi: surname,
        telefon: phone,
        joylashuv: userLocation,
        buyurtma: orderItems,
        jami: totalPrice
    };

    try {
        tg.sendData(JSON.stringify(data));
    } catch (e) {
        alert('Buyurtma yuborildi (test rejimda)');
    }
}

/* ============================
   INIT
   ============================ */
renderAll();
updateCartUI();

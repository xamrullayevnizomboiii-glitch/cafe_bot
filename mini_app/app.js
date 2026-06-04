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
   TOAST
   ============================ */
function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () {
        toast.classList.remove('show');
    }, 2000);
}

/* ============================
   GLOBAL O'ZGARUVCHILAR
   ============================ */
var cart = {};
var saved = {};
var userLocation = null;
var currentView = 'main';

/* ============================
   DOM ELEMENTLARI
   ============================ */
var foodsList = document.getElementById('foods-list');
var drinksList = document.getElementById('drinks-list');
var saladsList = document.getElementById('salads-list');
var savedList = document.getElementById('saved-list');
var cartItemsContainer = document.getElementById('cart-items');
var cartBadge = document.getElementById('cart-badge');
var totalPriceEl = document.getElementById('total-price');
var cartTotalBlock = document.getElementById('cart-total-block');
var orderForm = document.getElementById('order-form');
var locationBtn = document.getElementById('location-btn');
var savedOverlay = document.getElementById('saved-overlay');
var checkoutBtn = document.getElementById('checkout-btn');
var submitOrderBtn = document.getElementById('submit-order-btn');

/* ============================
   NAVIGATSIYA
   ============================ */
var navBtns = document.querySelectorAll('.nav-btn');
var sections = document.querySelectorAll('.section');

navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
        haptic();
        var targetId = btn.getAttribute('data-target');

        sections.forEach(function (sec) { sec.classList.remove('active'); });
        navBtns.forEach(function (b) { b.classList.remove('active'); });
        orderForm.style.display = 'none';
        savedOverlay.style.display = 'none';

        document.getElementById(targetId).classList.add('active');
        btn.classList.add('active');

        currentView = targetId === 'cart-section' ? 'cart' : 'main';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

/* ============================
   SAQLANGANLAR (Savat ichida)
   ============================ */
document.getElementById('open-saved-btn').addEventListener('click', function () {
    haptic();
    document.getElementById('cart-section').classList.remove('active');
    savedOverlay.style.display = 'block';
    savedOverlay.classList.add('active');
    currentView = 'saved';
    renderSaved();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('back-from-saved').addEventListener('click', function () {
    haptic();
    savedOverlay.style.display = 'none';
    savedOverlay.classList.remove('active');
    document.getElementById('cart-section').classList.add('active');
    currentView = 'cart';
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============================
   XARID QILISH TUGMASI
   ============================ */
checkoutBtn.addEventListener('click', function () {
    haptic();
    document.getElementById('cart-section').classList.remove('active');
    orderForm.style.display = 'block';
    orderForm.classList.add('active');
    currentView = 'order';
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============================
   BUYURTMA RASMIYLASHTIRISH TUGMASI
   ============================ */
submitOrderBtn.addEventListener('click', function () {
    submitOrder();
});

/* ============================
   Orqaga (Buyurtma -> Savat)
   ============================ */
document.getElementById('back-to-cart-btn').addEventListener('click', function () {
    haptic();
    orderForm.style.display = 'none';
    orderForm.classList.remove('active');
    document.getElementById('cart-section').classList.add('active');
    currentView = 'cart';
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============================
   USER PROFIL
   ============================ */
var userProfile = document.getElementById('user-profile');
if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    var user = tg.initDataUnsafe.user;
    var photoUrl = user.photo_url || 'https://telegram.org/img/t_logo.png';
    var uname = [user.first_name, user.last_name].filter(Boolean).join(' ');
    var username = user.username ? '@' + user.username : '';

    userProfile.innerHTML =
        '<img src="' + photoUrl + '" alt="Avatar" class="user-avatar" onerror="this.src=\'https://telegram.org/img/t_logo.png\'">' +
        '<div class="user-info">' +
            '<div class="user-name">' + uname + '</div>' +
            '<div class="user-username">' + username + '</div>' +
        '</div>';
    userProfile.style.display = 'flex';
}

/* ============================
   MAHSULOT TOPISH
   ============================ */
function getProductById(id) {
    var found = menuData.foods.find(function (p) { return p.id === id; });
    if (!found) found = menuData.drinks.find(function (p) { return p.id === id; });
    if (!found) found = menuData.salads.find(function (p) { return p.id === id; });
    return found;
}

/* ============================
   RENDER
   ============================ */
function renderProducts(products, container) {
    container.innerHTML = '';
    products.forEach(function (product) {
        var isSaved = saved[product.id];
        var heartContent = isSaved ? '❤️' : '🤍';

        var div = document.createElement('div');
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
    var count = cart[id] ? cart[id].count : 0;

    var container = document.getElementById('controls-' + id);
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

    var savedContainer = document.getElementById('saved-controls-' + id);
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
    var keys = Object.keys(saved);
    if (keys.length === 0) {
        savedList.innerHTML = '<p class="empty-cart" style="grid-column: span 2;">Saqlangan taomlar yo\'q</p>';
        return;
    }

    keys.forEach(function (id) {
        var product = getProductById(id);
        if (!product) return;
        var div = document.createElement('div');
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
   SAQLASH (LIKE) + TOAST
   ============================ */
window.toggleSaved = function (id) {
    haptic();
    if (saved[id]) {
        delete saved[id];
        showToast('❌ Mahsulot olib tashlandi');
    } else {
        saved[id] = true;
        showToast('❤️ Mahsulotingiz saqlandi');
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
    var product = getProductById(id);
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
    var totalItems = 0;
    var totalPrice = 0;

    var cartKeys = Object.keys(cart);

    if (cartKeys.length === 0) {
        cartItemsContainer.innerHTML =
            '<div class="empty-cart">' +
                '<div class="empty-icon">🛒</div>' +
                '<p>Savatingiz bo\'sh</p>' +
            '</div>';
        cartBadge.style.display = 'none';
        cartTotalBlock.style.display = 'none';
    } else {
        cartKeys.forEach(function (id) {
            var item = cart[id];
            totalItems += item.count;
            totalPrice += item.price * item.count;

            var div = document.createElement('div');
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
}

/* ============================
   JOYLASHUV
   ============================ */
locationBtn.addEventListener('click', function () {
    haptic();
    if (navigator.geolocation) {
        document.getElementById('location-status').textContent = 'Joylashuv olinmoqda...';
        navigator.geolocation.getCurrentPosition(
            function (position) {
                userLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
                document.getElementById('location-status').textContent = '✅ Joylashuv olindi!';
            },
            function () {
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
    var name = document.getElementById('name').value.trim();
    var surname = document.getElementById('surname').value.trim();
    var phone = document.getElementById('phone').value.trim();

    if (!name || !phone) {
        try {
            tg.showAlert('Iltimos, Ism va Telefon raqamini kiriting!');
        } catch (e) {
            alert('Iltimos, Ism va Telefon raqamini kiriting!');
        }
        return;
    }

    var orderItems = Object.keys(cart).map(function (id) {
        return {
            nomi: cart[id].name,
            soni: cart[id].count,
            narxi: cart[id].price
        };
    });

    var totalPrice = 0;
    Object.keys(cart).forEach(function (id) {
        totalPrice += cart[id].price * cart[id].count;
    });

    var data = {
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

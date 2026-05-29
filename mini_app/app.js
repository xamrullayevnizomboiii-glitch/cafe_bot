const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Mavzuni moslashtirish (Theme)
function applyTheme() {
    if (tg.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('theme-dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.remove('theme-dark');
    }
}
applyTheme();
tg.onEvent('themeChanged', applyTheme);

let cart = {};
let userLocation = null;

// Foydalanuvchi ma'lumotlarini yuklash
const userProfile = document.getElementById('user-profile');

let user = (tg.initDataUnsafe && tg.initDataUnsafe.user) ? tg.initDataUnsafe.user : null;

// Agar Telegram orqali kirilsa haqiqiy user olinadi. 
if (!user) {
    user = {
        first_name: "Profil",
        last_name: "",
        username: "",
        photo_url: ""
    };
}

const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
const username = user.username ? `@${user.username}` : '';
const initial = user.first_name ? user.first_name.charAt(0).toUpperCase() : 'P';

let avatarHTML = '';
if (user.photo_url) {
    avatarHTML = `<img src="${user.photo_url}" alt="Avatar" class="user-avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                  <div class="user-avatar-text" style="display:none;">${initial}</div>`;
} else {
    avatarHTML = `<div class="user-avatar-text">${initial}</div>`;
}

userProfile.innerHTML = `
    ${avatarHTML}
    <div class="user-info">
        <div class="user-name">${name}</div>
        <div class="user-username">${username}</div>
    </div>
`;
userProfile.style.display = 'flex';

// Toast click listener
const toast = document.getElementById('toast');
toast.style.cursor = 'pointer';
toast.addEventListener('click', () => {
    toast.classList.remove('show');
    
    // Saqlanganlarga o'tish
    orderForm.style.display = 'none';
    sections.forEach(sec => sec.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('saved-section').classList.add('active');
    renderSavedProducts();
    window.scrollTo(0, 0);
});

// HTML elementlar
const foodsList = document.getElementById('foods-list');
const drinksList = document.getElementById('drinks-list');
const saladsList = document.getElementById('salads-list');
const cartItemsContainer = document.getElementById('cart-items');
const cartBadge = document.getElementById('cart-badge');
const totalPriceEl = document.getElementById('total-price');
const cartTotalDiv = document.querySelector('.cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const orderForm = document.getElementById('order-form');
const locationBtn = document.getElementById('location-btn');
const submitOrderBtn = document.getElementById('submit-order-btn');
const backToCartBtn = document.getElementById('back-to-cart-btn');

// Navigatsiya
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Formni yashirish
        orderForm.style.display = 'none';
        
        // Barcha bo'limlarni yashirish
        sections.forEach(sec => sec.classList.remove('active'));
        navBtns.forEach(b => b.classList.remove('active'));
        
        // Tanlanganini ko'rsatish
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        btn.classList.add('active');
        
        // Yangi bo'limga o'tganda yuqoridan boshlanishi uchun
        window.scrollTo(0, 0);
    });
});

// Saqlangan mahsulotlar (Favorites)
let favorites = JSON.parse(localStorage.getItem('cafe_favorites')) || [];

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    // Haptic feedback
    tg.HapticFeedback.notificationOccurred('success');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

window.toggleFavorite = function(id, event) {
    if (event) event.stopPropagation(); // Ota elementga o'tib ketmasligi uchun
    
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(id);
        showToast("Mahsulot profilingizda saqlandi ❤️");
    }
    
    localStorage.setItem('cafe_favorites', JSON.stringify(favorites));
    
    // Barcha mos keluvchi tugmalarni yangilash
    document.querySelectorAll(`.like-btn[data-id="${id}"]`).forEach(btn => {
        if (favorites.includes(id)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Agar saqlanganlar bo'limi ochiq bo'lsa, uni yangilash
    if (document.getElementById('saved-section').classList.contains('active')) {
        renderSavedProducts();
    }
}

// Mahsulotlarni chiqarish
function renderProducts(products, container) {
    container.innerHTML = ''; // Tozalash
    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'card';
        const isFav = favorites.includes(product.id);
        
        // Agar maxsus id formati kerak bo'lsa (savat uchun va h.k), saqlangan count ni olish uchun
        const currentCount = cart[product.id] ? cart[product.id].count : 0;
        
        div.innerHTML = `
            <button class="like-btn ${isFav ? 'active' : ''}" data-id="${product.id}" onclick="toggleFavorite('${product.id}', event)">
                ♥
            </button>
            <h3>${product.name}</h3>
            <img src="${product.image}" alt="${product.name}">
            <p class="price">${product.price.toLocaleString()} so'm</p>
            <div class="controls">
                <button onclick="updateCart('${product.id}', -1)">-</button>
                <span class="count-${product.id}">${currentCount}</span>
                <button onclick="updateCart('${product.id}', 1)">+</button>
            </div>
        `;
        container.appendChild(div);
    });
}

renderProducts(menuData.foods, foodsList);
renderProducts(menuData.drinks, drinksList);
renderProducts(menuData.salads, saladsList);

// Savatdan o'chirish
window.removeFromCart = function(id) {
    if(cart[id]) {
        delete cart[id];
        document.querySelectorAll(`.count-${id}`).forEach(el => el.textContent = '0');
        updateCartUI();
    }
}

// Mahsulotni ID bo'yicha topish
function getProductById(id) {
    let found = menuData.foods.find(p => p.id === id);
    if (!found) found = menuData.drinks.find(p => p.id === id);
    if (!found) found = menuData.salads.find(p => p.id === id);
    return found;
}

// Savatni yangilash mantiqi
window.updateCart = function(id, change) {
    const product = getProductById(id);
    if (!product && !cart[id]) return;
    
    if (!cart[id]) {
        cart[id] = { name: product.name, price: product.price, count: 0 };
    }
    
    cart[id].count += change;
    
    if (cart[id].count <= 0) {
        delete cart[id];
        document.querySelectorAll(`.count-${id}`).forEach(el => el.textContent = '0');
    } else {
        document.querySelectorAll(`.count-${id}`).forEach(el => el.textContent = cart[id].count);
    }
    
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
        return;
    }
    
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
            <div class="controls">
                <button onclick="updateCart('${id}', -1)">-</button>
                <span>${item.count}</span>
                <button onclick="updateCart('${id}', 1)">+</button>
                <button class="delete-btn" onclick="removeFromCart('${id}')">🗑</button>
            </div>
        `;
        cartItemsContainer.appendChild(div);
    });
    
    cartBadge.textContent = totalItems;
    cartBadge.style.display = 'inline-block';
    
    totalPriceEl.textContent = totalPrice.toLocaleString();
    cartTotalDiv.style.display = 'flex';
}

// Xaridni rasmiylashtirish tugmasi
checkoutBtn.addEventListener('click', () => {
    document.getElementById('cart-section').classList.remove('active');
    cartTotalDiv.style.display = 'none';
    orderForm.style.display = 'block';
});

// Orqaga tugmasi (Savatga qaytish)
backToCartBtn.addEventListener('click', () => {
    orderForm.style.display = 'none';
    document.getElementById('cart-section').classList.add('active');
    cartTotalDiv.style.display = 'flex';
});

// Joylashuvni olish
locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        document.getElementById('location-status').textContent = 'Joylashuv olinmoqda...';
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                document.getElementById('location-status').textContent = '📍 Joylashuv muvaffaqiyatli olindi!';
                document.getElementById('location-status').style.color = 'var(--main-btn)';
            },
            (error) => {
                document.getElementById('location-status').textContent = 'Joylashuvni olishda xatolik yuz berdi. Iltimos, brauzer sozlamalaridan ruxsat bering.';
                document.getElementById('location-status').style.color = '#E74C3C';
            }
        );
    } else {
        document.getElementById('location-status').textContent = 'Sizning brauzeringiz joylashuvni qo\'llab-quvvatlamaydi.';
    }
});

// Buyurtma berish
submitOrderBtn.addEventListener('click', () => {
    const name = document.getElementById('name').value;
    const surname = document.getElementById('surname').value;
    const phone = document.getElementById('phone').value;
    
    if (!name || !surname || !phone) {
        tg.showAlert("Iltimos, barcha majburiy maydonlarni to'ldiring!");
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
});

// Profil bosilganda saqlanganlarni ko'rsatish
userProfile.addEventListener('click', () => {
    orderForm.style.display = 'none';
    sections.forEach(sec => sec.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('saved-section').classList.add('active');
    renderSavedProducts();
    window.scrollTo(0, 0);
});

document.getElementById('back-from-saved-btn').addEventListener('click', () => {
    document.getElementById('saved-section').classList.remove('active');
    document.getElementById('foods-section').classList.add('active');
    navBtns[0].classList.add('active'); // Taomlar active
});

function renderSavedProducts() {
    const savedList = document.getElementById('saved-list');
    
    // Barcha mahsulotlarni yig'ish
    const allProducts = [...menuData.foods, ...menuData.drinks, ...menuData.salads];
    
    // Saqlangan mahsulotlarni olish, lekin tartibini saqlash yoki topish
    // Remove duplicates just in case
    const uniqueFavorites = [...new Set(favorites)];
    const savedProducts = uniqueFavorites.map(id => getProductById(id)).filter(Boolean);
    
    if (savedProducts.length === 0) {
        savedList.innerHTML = `<p class="empty-cart" style="grid-column: span 2;">Saqlangan mahsulotlar yo'q</p>`;
    } else {
        renderProducts(savedProducts, savedList);
    }
}

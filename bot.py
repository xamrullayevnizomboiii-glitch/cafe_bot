import asyncio
import json
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, ReplyKeyboardMarkup, KeyboardButton
from aiogram.client.default import DefaultBotProperties

from config import BOT_TOKEN, ADMIN_ID

# WEBAPP URL - Buni Dokploy/Cloudflare orqali olingan manzilga almashtiramiz
WEBAPP_URL = "https://app.arakulovlandingpage.com"

# Bot va Dispatcher yaratish
bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode='HTML'))
dp = Dispatcher()

# /start komandasi uchun handler
@dp.message(CommandStart())
async def command_start_handler(message: types.Message) -> None:
    # WebApp tugmasini yaratish
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🍽 Menyuni ko'rish va buyurtma berish 🛒", web_app=WebAppInfo(url=WEBAPP_URL))]
        ],
        resize_keyboard=True
    )
    
    await message.answer(
        f"👋 <b>Assalomu alaykum, {message.from_user.full_name}!</b>\n\n"
        f"🌟 <b>Bizning kafemizga xush kelibsiz!</b>\n\n"
        f"<i>👇 Quyidagi tugmani bosib, bizning mazali taomlarimiz bilan tanishishingiz va o'zingizga yoqqanlarini buyurtma qilishingiz mumkin!</i> 🍔🍕",
        reply_markup=keyboard
    )

# WebApp dan ma'lumotlarni qabul qilish
@dp.message(F.web_app_data)
async def web_app_data_handler(message: types.Message):
    data = json.loads(message.web_app_data.data)
    
    user = message.from_user
    
    ismi = data.get('ismi', '')
    familyasi = data.get('familyasi', '')
    telefon = data.get('telefon', '')
    joylashuv = data.get('joylashuv')
    buyurtmalar = data.get('buyurtma', [])
    jami = data.get('jami', 0)
    
    # Mijozga qisqa xabar yuborish
    await message.answer("✅ Buyurtmangiz qabul qilindi. Tez orada siz bilan bog'lanamiz!")
    
    # Adminga buyurtma tafsilotlarini yuborish
    buyurtma_matni = (
        f"🆕 <b>YANGI BUYURTMA</b>\n\n"
        f"👤 <b>Mijoz:</b> {familyasi} {ismi}\n"
        f"📞 <b>Telefon raqami:</b> {telefon}\n"
        f"🔗 <b>Username:</b> @{user.username if user.username else 'yoq'}\n"
        f"🆔 <b>ID:</b> {user.id}\n\n"
        f"🛒 <b>Buyurtmalar:</b>\n"
    )
    
    for i, item in enumerate(buyurtmalar, 1):
        buyurtma_matni += f"{i}. {item['nomi']} - {item['soni']} ta ( {item['narxi']} so'm )\n"
        
    buyurtma_matni += f"\n💰 <b>Jami summa:</b> {jami:,} so'm"
    
    # Admin uchun tugmalar
    admin_keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Qabul qilindi", callback_data=f"accept_{user.id}"),
            InlineKeyboardButton(text="❌ Bekor qilindi", callback_data=f"reject_{user.id}")
        ]
    ])
    
    # Adminga xabarni yuborish
    await bot.send_message(
        chat_id=ADMIN_ID,
        text=buyurtma_matni,
        reply_markup=admin_keyboard
    )
    
    # Agar joylashuv bo'lsa, xaritada manzilni yuborish
    if joylashuv and 'lat' in joylashuv and 'lon' in joylashuv:
        await bot.send_location(
            chat_id=ADMIN_ID,
            latitude=joylashuv['lat'],
            longitude=joylashuv['lon']
        )

# Admin tugmalariga javob (Callback Query)
@dp.callback_query(lambda c: c.data and (c.data.startswith('accept_') or c.data.startswith('reject_')))
async def process_callback_order(callback_query: types.CallbackQuery):
    action, user_id = callback_query.data.split('_')
    
    if action == 'accept':
        await bot.send_message(chat_id=user_id, text="🎉 Buyurtmangiz admin tomonidan qabul qilindi va tayyorlanishni boshladi!")
        await callback_query.message.edit_text(callback_query.message.text + "\n\n<i>Holati: ✅ Qabul qilindi</i>")
    elif action == 'reject':
        await bot.send_message(chat_id=user_id, text="😔 Kechirasiz, buyurtmangiz bekor qilindi.")
        await callback_query.message.edit_text(callback_query.message.text + "\n\n<i>Holati: ❌ Bekor qilindi</i>")
        
    await callback_query.answer()

async def main():
    print("Bot ishga tushdi...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

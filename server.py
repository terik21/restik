from flask import Flask, request, jsonify
import sqlite3
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:8000"}})   # Разрешает запросы с фронта

# Функция для подключения к базе данных SQLite
def connect_db():
    return sqlite3.connect("database.db", check_same_thread=False)

# Инициализация базы данных: создание необходимых таблиц
with connect_db() as db:
    # Таблица пользователей: хранит информацию о сотрудниках
    db.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position TEXT,              
        fullname TEXT,             
        worker_code TEXT,          
        admin_code TEXT            
    )''')

    # Таблица категорий блюд
    db.execute('''CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT                  
    )''')

    # Таблица блюд с ценами
    db.execute('''CREATE TABLE IF NOT EXISTS dishes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,                 
        price REAL,               
        category_id INTEGER,      
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )''')

    # Таблица бронирований столиков
    db.execute('''CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number INTEGER,      
        guest_name TEXT,          
        reservation_date TEXT,    
        status TEXT DEFAULT 'active'  
    )''')

    # Таблица статусов столиков
    db.execute('''CREATE TABLE IF NOT EXISTS table_status (
        table_number INTEGER PRIMARY KEY,  
        status TEXT DEFAULT 'available',   
        occupied_at DATETIME               
    )''')

    # Таблица заказов
    db.execute('''CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number INTEGER,              
        status TEXT DEFAULT 'active',      
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
        total_price REAL DEFAULT 0         
    )''')

    # Таблица позиций в заказах
    db.execute('''CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,                  
        dish_name TEXT,                    
        price REAL,                        
        quantity INTEGER,                  
        FOREIGN KEY (order_id) REFERENCES orders(id)
    )''')

    # Таблица смен сотрудников
    db.execute('''CREATE TABLE IF NOT EXISTS shifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,                   
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,  
        end_time DATETIME DEFAULT NULL,    
        payment REAL DEFAULT NULL,         
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    db.commit()

# Обновляем структуру таблицы orders при запуске
with connect_db() as db:
    cursor = db.cursor()
    
    # Проверяем существование колонок перед их добавлением
    cursor.execute("PRAGMA table_info(orders)")
    existing_columns = [column[1] for column in cursor.fetchall()]
    
    # Добавляем колонки только если их нет
    if 'payment_method' not in existing_columns:
        db.execute('ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT NULL')
    if 'paid_amount' not in existing_columns:
        db.execute('ALTER TABLE orders ADD COLUMN paid_amount REAL DEFAULT NULL')
    if 'paid_at' not in existing_columns:
        db.execute('ALTER TABLE orders ADD COLUMN paid_at DATETIME DEFAULT NULL')
    
    db.commit()

# Добавление блюда
@app.route('/categories', methods=['GET'])
def get_categories():
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM categories")
        categories = cursor.fetchall()
    return jsonify([{"id": c[0], "name": c[1]} for c in categories])

@app.route('/add-category', methods=['POST'])
def add_category():
    name = request.json.get("name")
    with connect_db() as db:
        db.execute("INSERT INTO categories (name) VALUES (?)", (name,))
        db.commit()
    return jsonify({"message": "Раздел добавлен"}), 201

@app.route('/dishes/<int:category_id>', methods=['GET'])
def get_dishes(category_id):
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT id, name, price FROM dishes WHERE category_id = ?", (category_id,))
        dishes = cursor.fetchall()
    return jsonify([{"id": d[0], "name": d[1], "price": d[2]} for d in dishes])

@app.route('/add-dish', methods=['POST'])
def add_dish():
    data = request.json
    name = data.get("name")
    price = data.get("price")
    category_id = data.get("categoryId")

    with connect_db() as db:
        db.execute("INSERT INTO dishes (name, price, category_id) VALUES (?, ?, ?)", (name, price, category_id))
        db.commit()
    return jsonify({"message": "Блюдо добавлено"}), 201

# Удаление блюда
@app.route('/dishes/<int:dish_id>', methods=['DELETE'])
def delete_dish(dish_id):
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("DELETE FROM dishes WHERE id = ?", (dish_id,))
        db.commit()
    return jsonify({"message": "Блюдо удалено"}), 200

# Удаление категории и всех её блюд
@app.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    with connect_db() as db:
        cursor = db.cursor()
        # Сначала удаляем все блюда в категории
        cursor.execute("DELETE FROM dishes WHERE category_id = ?", (category_id,))
        # Затем удаляем саму категорию
        cursor.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        db.commit()
    return jsonify({"message": "Категория и все блюда в ней удалены"}), 200

# Регистрация пользователя
@app.route('/register', methods=['POST'])
def register():
    data = request.json

    required_fields = ["position", "fullname", "worker_code", "admin_code"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Отсутствуют необходимые поля"}), 400

    position = data["position"]
    fullname = data["fullname"]
    worker_code = data["worker_code"]
    admin_code = data["admin_code"]

    with connect_db() as db:
        cursor = db.cursor()
        # Проверяем существование администратора с указанным кодом
        cursor.execute("""
            SELECT id FROM users 
            WHERE worker_code = ? 
            AND position IN ('Администратор')
        """, (admin_code,))
        admin = cursor.fetchone()

        if not admin:
            return jsonify({"error": "Неверный код администратора"}), 403

        # Проверяем, не занят ли код работника
        cursor.execute("SELECT id FROM users WHERE worker_code = ?", (worker_code,))
        if cursor.fetchone():
            return jsonify({"error": "Этот код работника уже используется"}), 400

        cursor.execute("""
            INSERT INTO users (position, fullname, worker_code) 
            VALUES (?, ?, ?)""",
            (position, fullname, worker_code))
        db.commit()

    return jsonify({"message": "Пользователь зарегистрирован"}), 201

# Вход (проверка логина и пароля)
@app.route('/login', methods=['POST'])
def login():
    data = request.json

    if "fullname" not in data or "worker_code" not in data:
        return jsonify({"error": "Отсутствуют fullname или worker_code"}), 400

    fullname = data["fullname"]
    worker_code = data["worker_code"]

    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT id, position, fullname FROM users WHERE fullname = ? AND worker_code = ?", (fullname, worker_code))
        user = cursor.fetchone()

    if not user:
        return jsonify({"error": "Неверные данные"}), 401

    # Отправляем успешный ответ с данными пользователя
    return jsonify({
        "message": "Вход выполнен",
        "user": {
            "id": user[0],            # ID пользователя из базы данных
            "position": user[1],       # Должность пользователя (Администратор/Официант/и т.д.)
            "fullname": user[2]        # Полное имя пользователя
        }
    }), 200

# Примечание: маршруты /users и /users/<int:user_id> удалены,
# оставлены только маршруты регистрации и входа

# Функция для удаления пользователя из системы
@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    data = request.json
    admin_code = data.get('admin_code')  # Получаем код администратора из запроса

    with connect_db() as db:
        cursor = db.cursor()
        
        # Проверяем, является ли пользователь администратором
        cursor.execute("""
            SELECT id FROM users 
            WHERE worker_code = ? AND position = 'Администратор'
        """, (admin_code,))
        admin = cursor.fetchone()
        
        # Если код неверный или пользователь не администратор
        if not admin:
            return jsonify({"error": "Недостаточно прав или неверный код администратора"}), 403

        # Проверяем существование удаляемого пользователя
        cursor.execute("SELECT position FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "Пользователь не найден"}), 404

        # Удаляем пользователя из базы данных
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()

    return jsonify({"message": "Пользователь успешно удален"}), 200

# Получение списка всех пользователей
@app.route('/users', methods=['GET'])
def get_users():
    with connect_db() as db:
        cursor = db.cursor()
        # Выбираем всех сотрудников кроме администраторов
        cursor.execute("SELECT id, position, fullname FROM users WHERE position IN ('Официант', 'Повар', 'Менеджер')")
        users = cursor.fetchall()
        return jsonify([{
            "id": user[0],
            "position": user[1],
            "fullname": user[2]
        } for user in users])

# Добавление бронирования
@app.route('/add-reservation', methods=['POST'])
def add_reservation():
    data = request.json
    table_number = data.get("table_number")
    guest_name = data.get("guest_name")
    reservation_date = data.get("reservation_date")
    worker_code = data.get("worker_code")

    with connect_db() as db:
        # Проверяем права пользователя
        cursor = db.cursor()
        cursor.execute("""
            SELECT position FROM users 
            WHERE worker_code = ? AND (position = 'Администратор' OR position = 'Менеджер')
        """, (worker_code,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Недостаточно прав для бронирования стола"}), 403

        # Проверяем, нет ли уже бронирования на это время
        cursor.execute("""
            SELECT id FROM reservations 
            WHERE table_number = ? AND reservation_date = ? AND status = 'active'
        """, (table_number, reservation_date))
        existing = cursor.fetchone()

        if existing:
            return jsonify({"error": "Этот стол уже забронирован на указанное время"}), 400

        cursor.execute("""
            INSERT INTO reservations (table_number, guest_name, reservation_date) 
            VALUES (?, ?, ?)
        """, (table_number, guest_name, reservation_date))
        db.commit()

    return jsonify({"message": "Бронирование успешно создано"}), 201

# Получение бронирований для стола
@app.route('/reservations/<int:table_number>', methods=['GET'])
def get_table_reservations(table_number):
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            SELECT guest_name, reservation_date 
            FROM reservations 
            WHERE table_number = ? AND status = 'active'
        """, (table_number,))
        reservations = cursor.fetchall()
    return jsonify([{"guest": r[0], "date": r[1]} for r in reservations])

# Отмена бронирования
@app.route('/cancel-reservation/<int:table_number>', methods=['POST'])
def cancel_reservation(table_number):
    data = request.json
    reservation_date = data.get('reservation_date')
    admin_code = data.get('admin_code')
    
    # Проверяем код администратора/менеджера
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            SELECT position FROM users 
            WHERE worker_code = ? AND (position = 'Администратор' OR position = 'Менеджер')
        """, (admin_code,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"error": "Неверный код или недостаточно прав"}), 403
            
        cursor.execute("""
            UPDATE reservations 
            SET status = 'cancelled' 
            WHERE table_number = ? 
            AND reservation_date = ? 
            AND status = 'active'
        """, (table_number, reservation_date))
        db.commit()
        
        if cursor.rowcount > 0:
            return jsonify({"message": "Бронирование отменено"}), 200
        return jsonify({"error": "Бронирование не найдено"}), 404

@app.route('/table-status/<int:table_number>', methods=['GET'])
def get_table_status(table_number):
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            SELECT status, occupied_at 
            FROM table_status 
            WHERE table_number = ?
        """, (table_number,))
        status = cursor.fetchone()
        if not status:
            cursor.execute("""
                INSERT INTO table_status (table_number, status)
                VALUES (?, 'available')
            """, (table_number,))
            db.commit()
            return jsonify({"status": "available", "occupied_at": None})
    return jsonify({"status": status[0], "occupied_at": status[1]})

@app.route('/update-table-status/<int:table_number>', methods=['POST'])
def update_table_status(table_number):
    status = request.json.get('status')
    with connect_db() as db:
        cursor = db.cursor()
        if status == 'occupied':
            cursor.execute("""
                INSERT OR REPLACE INTO table_status (table_number, status, occupied_at)
                VALUES (?, ?, datetime('now'))
            """, (table_number, status))
        else:
            cursor.execute("""
                INSERT OR REPLACE INTO table_status (table_number, status, occupied_at)
                VALUES (?, ?, NULL)
            """, (table_number, status))
        db.commit()
    return jsonify({"message": f"Статус стола обновлен на {status}"}), 200

# Создание нового заказа для стола
@app.route('/create-order/<int:table_number>', methods=['POST'])
def create_order(table_number):
    data = request.json
    items = data.get('items', [])  # Список блюд в заказе
    
    with connect_db() as db:
        cursor = db.cursor()
        # Создаем новую запись заказа
        cursor.execute("""
            INSERT INTO orders (table_number)
            VALUES (?)
        """, (table_number,))
        order_id = cursor.lastrowid
        
        total_price = 0
        # Добавляем позиции заказа
        for item in items:
            cursor.execute("""
                INSERT INTO order_items (order_id, dish_name, price, quantity)
                VALUES (?, ?, ?, ?)
            """, (order_id, item['name'], item['price'], item['quantity']))
            total_price += item['price'] * item['quantity']
        
        # Обновляем общую стоимость заказа
        cursor.execute("""
            UPDATE orders SET total_price = ?
            WHERE id = ?
        """, (total_price, order_id))
        
        db.commit()
    
    return jsonify({"message": "Заказ создан", "order_id": order_id}), 201

# Получение заказов для конкретного стола
@app.route('/orders/<int:table_number>', methods=['GET'])
def get_table_orders(table_number):
    with connect_db() as db:
        cursor = db.cursor()
        # Получаем все активные заказы стола с их позициями
        cursor.execute("""
            SELECT o.id, o.created_at, o.total_price, o.status,
                   GROUP_CONCAT(oi.quantity || 'x ' || oi.dish_name) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.table_number = ? AND o.status = 'active'
            GROUP BY o.id
        """, (table_number,))
        orders = cursor.fetchall()
        
    return jsonify([{
        "id": o[0],
        "created_at": o[1],
        "total_price": o[2],
        "status": o[3],
        "items": o[4].split(',') if o[4] else []
    } for o in orders]), 200

@app.route('/all-orders', methods=['GET'])
def get_all_orders():
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            SELECT o.id, o.table_number, o.created_at, o.total_price, o.status,
                   GROUP_CONCAT(oi.quantity || 'x ' || oi.dish_name) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'active'
            GROUP BY o.id
            ORDER BY o.created_at DESC
        """)
        orders = cursor.fetchall()
        
    return jsonify([{
        "id": o[0],
        "table_number": o[1],
        "created_at": o[2],
        "total_price": o[3],
        "status": o[4],
        "items": o[5].split(',') if o[5] else []
    } for o in orders]), 200

@app.route('/order-details/<int:order_id>', methods=['GET'])
def get_order_details(order_id):
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            SELECT o.id, o.table_number, o.created_at, o.total_price,
                   oi.dish_name, oi.price, oi.quantity
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
        """, (order_id,))
        rows = cursor.fetchall()
        
        if not rows:
            return jsonify({"error": "Заказ не найден"}), 404
            
        order = {
            "id": rows[0][0],
            "table_number": rows[0][1],
            "created_at": rows[0][2],
            "total_price": rows[0][3],
            "items": [{
                "name": row[4],
                "price": row[5],
                "quantity": row[6]
            } for row in rows if row[4]]
        }
        
        return jsonify(order), 200

@app.route('/cancel-order/<int:order_id>', methods=['POST'])
def cancel_order(order_id):
    data = request.json
    worker_code = data.get('worker_code')
    
    with connect_db() as db:
        cursor = db.cursor()
        # Проверяем права пользователя
        cursor.execute("""
            SELECT position FROM users 
            WHERE worker_code = ? AND (position IN ('Администратор', 'Менеджер', 'Официант'))
        """, (worker_code,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"error": "Недостаточно прав для отмены заказа"}), 403
            
        cursor.execute("""
            UPDATE orders 
            SET status = 'cancelled'
            WHERE id = ? AND status = 'active'
        """, (order_id,))
        db.commit()
        
        if cursor.rowcount > 0:
            return jsonify({"message": "Заказ отменен"}), 200
        return jsonify({"error": "Заказ не найден или уже отменен"}), 404

# Обработка оплаты заказа
@app.route('/process-payment/<int:order_id>', methods=['POST'])
def process_payment(order_id):
    data = request.json
    amount = data.get('amount')          # Сумма оплаты
    payment_method = data.get('payment_method')  # Способ оплаты
    
    with connect_db() as db:
        cursor = db.cursor()
        # Проверяем существование и статус заказа
        cursor.execute("""
            SELECT total_price, status 
            FROM orders 
            WHERE id = ?
        """, (order_id,))
        order = cursor.fetchone()
        
        if not order:
            return jsonify({"error": "Заказ не найден"}), 404
        
        if order[1] != 'active':
            return jsonify({"error": "Заказ уже оплачен или отменен"}), 400
            
        # Обновляем статус заказа на 'paid'
        cursor.execute("""
            UPDATE orders 
            SET status = 'paid', 
                payment_method = ?,
                paid_amount = ?,
                paid_at = datetime('now')
            WHERE id = ?
        """, (payment_method, amount, order_id))
        db.commit()
        
    return jsonify({"message": "Оплата прошла успешно"}), 200

# Начало рабочей смены сотрудника
@app.route('/start-shift', methods=['POST'])
def start_shift():
    data = request.json
    user_id = data.get('user_id')  # ID сотрудника
    
    with connect_db() as db:
        cursor = db.cursor()
        # Создаем новую запись смены с текущим временем начала
        cursor.execute("""
            INSERT INTO shifts (user_id, start_time)
            VALUES (?, datetime('now', '+3 hours'))
        """, (user_id,))
        db.commit()
    return jsonify({"message": "Смена начата"}), 201

# Завершение рабочей смены
@app.route('/end-shift/<int:shift_id>', methods=['POST'])
def end_shift(shift_id):
    with connect_db() as db:
        cursor = db.cursor()
        # Завершаем смену и рассчитываем оплату (4 рубля в минуту)
        cursor.execute("""
            UPDATE shifts 
            SET end_time = datetime('now', '+3 hours'),
                payment = (strftime('%s', datetime('now', '+3 hours')) - strftime('%s', start_time)) / 60.0 * 4
            WHERE id = ? AND end_time IS NULL
        """, (shift_id,))
        db.commit()

# Получение истории смен сотрудника
@app.route('/user-shifts/<int:user_id>', methods=['GET'])
def get_user_shifts(user_id):
    with connect_db() as db:
        cursor = db.cursor()
        # Получаем все смены сотрудника с расчетом оплаты
        cursor.execute("""
            SELECT 
                id,
                start_time,
                end_time,
                CASE 
                    WHEN end_time IS NULL THEN 'активная смена'
                    ELSE 'завершена'
                END as status,
                CASE
                    WHEN end_time IS NOT NULL 
                    THEN (strftime('%s', end_time) - strftime('%s', start_time)) / 60.0 * 4
                    ELSE NULL
                END as payment
            FROM shifts 
            WHERE user_id = ?
            ORDER BY start_time DESC
        """, (user_id,))
        shifts = cursor.fetchall()
        
        return jsonify([{
            "id": shift[0],
            "start_time": shift[1],
            "end_time": shift[2],
            "status": shift[3],
            "payment": round(shift[4], 2) if shift[4] is not None else None
        } for shift in shifts]), 200

if __name__ == '__main__':
    app.run(debug=True, port=5001)

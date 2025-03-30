from flask import Flask, request, jsonify
import sqlite3
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:8000"}})   # Разрешает запросы с фронта

def connect_db():
    return sqlite3.connect("database.db", check_same_thread=False)

# Создание таблицы пользователей
with connect_db() as db:
    db.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position TEXT,
        fullname TEXT,
        worker_code TEXT,
        admin_code TEXT
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS dishes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        category_id INTEGER,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number INTEGER,
        guest_name TEXT,
        reservation_date TEXT,
        status TEXT DEFAULT 'active'
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS table_status (
        table_number INTEGER PRIMARY KEY,
        status TEXT DEFAULT 'available',
        occupied_at DATETIME
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number INTEGER,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_price REAL DEFAULT 0
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        dish_name TEXT,
        price REAL,
        quantity INTEGER,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    )''')
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
        cursor.execute("SELECT name, price FROM dishes WHERE category_id = ?", (category_id,))
        dishes = cursor.fetchall()
    return jsonify([{"name": d[0], "price": d[1]} for d in dishes])

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

    if admin_code != '4321':
        return jsonify({"error": "Неверный код админа"}), 403

    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("INSERT INTO users (position, fullname, worker_code, admin_code) VALUES (?, ?, ?, ?)",
                       (position, fullname, worker_code, admin_code))
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

    return jsonify({
        "message": "Вход выполнен",
        "user": {
            "id": user[0],
            "position": user[1],
            "fullname": user[2]
        }
    }), 200

# Получение списка пользователей
@app.route('/users', methods=['GET'])
def get_users():
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT id, position, fullname FROM users")
        users = cursor.fetchall()

    return jsonify(users), 200

# Редактирование пользователя
@app.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json

    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("UPDATE users SET position = ?, fullname = ?, worker_code = ? WHERE id = ?",
                       (data.get("position"), data.get("fullname"), data.get("worker_code"), user_id))
        db.commit()

    return jsonify({"message": "Пользователь обновлен"}), 200

# Удаление пользователя
@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    with connect_db() as db:
        cursor = db.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()

    return jsonify({"message": "Пользователь удален"}), 200

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

@app.route('/create-order/<int:table_number>', methods=['POST'])
def create_order(table_number):
    data = request.json
    items = data.get('items', [])
    
    with connect_db() as db:
        cursor = db.cursor()
        # Create new order
        cursor.execute("""
            INSERT INTO orders (table_number)
            VALUES (?)
        """, (table_number,))
        order_id = cursor.lastrowid
        
        total_price = 0
        # Add order items
        for item in items:
            cursor.execute("""
                INSERT INTO order_items (order_id, dish_name, price, quantity)
                VALUES (?, ?, ?, ?)
            """, (order_id, item['name'], item['price'], item['quantity']))
            total_price += item['price'] * item['quantity']
        
        # Update total price
        cursor.execute("""
            UPDATE orders SET total_price = ?
            WHERE id = ?
        """, (total_price, order_id))
        
        db.commit()
    
    return jsonify({"message": "Заказ создан", "order_id": order_id}), 201

@app.route('/orders/<int:table_number>', methods=['GET'])
def get_table_orders(table_number):
    with connect_db() as db:
        cursor = db.cursor()
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

if __name__ == '__main__':
    app.run(debug=True, port=5001)

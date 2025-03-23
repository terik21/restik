from app import app, db
from models import User

# Добавляем пользователей в контексте приложения
with app.app_context():
    # Создаем пользователей
    admin = User(position="Admin", fullname="Главный Администратор", worker_code="0001", admin_code="9999")
    manager = User(position="Manager", fullname="Управляющий", worker_code="0002", admin_code="8888")

    # Добавляем в базу
    db.session.add(admin)
    db.session.add(manager)
    db.session.commit()

    print("✅ Пользователи добавлены в базу данных!")

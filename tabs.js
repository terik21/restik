// Utility functions at the top
function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
}

function closeReservationModal() {
    document.getElementById('reservation-modal').style.display = 'none';
}

function showReservationModal(tableNumber) {
    const reservationModal = document.getElementById('reservation-modal');
    document.getElementById('selected-table-number').textContent = tableNumber;
    document.getElementById('table-number').value = tableNumber;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('reservation-date').min = minDateTime;
    
    reservationModal.style.display = 'flex';
}

function updateOrderSummary() {
    const selectedItems = document.getElementById('selected-items');
    const totalPriceSpan = document.getElementById('total-price');
    let total = 0;
    let orderItems = [];

    document.querySelectorAll('.order-dish input[type="number"]').forEach(input => {
        const quantity = parseInt(input.value);
        if (quantity > 0) {
            const name = input.dataset.name;
            const price = parseFloat(input.dataset.price);
            const itemTotal = price * quantity;
            total += itemTotal;
            orderItems.push(`${quantity}x ${name} - ${itemTotal} руб.`);
        }
    });

    selectedItems.innerHTML = orderItems.join('<br>');
    totalPriceSpan.textContent = total;
}

// Add these functions at the top with other utility functions

function closeOrdersModal() {
    document.getElementById('orders-modal').style.display = 'none';
}

function updateOrdersSummary() {
    const selectedItems = document.getElementById('orders-selected-items');
    const totalPriceSpan = document.getElementById('orders-total-price');
    let total = 0;
    let orderItems = [];

    document.querySelectorAll('#orders-categories .order-dish input[type="number"]').forEach(input => {
        const quantity = parseInt(input.value);
        if (quantity > 0) {
            const name = input.dataset.name;
            const price = parseFloat(input.dataset.price);
            const itemTotal = price * quantity;
            total += itemTotal;
            orderItems.push(`${quantity}x ${name} - ${itemTotal} руб.`);
        }
    });

    selectedItems.innerHTML = orderItems.join('<br>');
    totalPriceSpan.textContent = total;
}

async function loadOrders() {
    const ordersContainer = document.getElementById('active-orders-list');
    
    try {
        const response = await fetch('http://localhost:5001/all-orders');
        const orders = await response.json();
        
        ordersContainer.innerHTML = orders.map(order => `
            <div class="order-item" data-order-id="${order.id}" onclick="showOrderDetails(${order.id})">
                <div class="order-header">
                    <strong>Стол ${order.table_number}</strong>
                    <span>${new Date(order.created_at).toLocaleTimeString()}</span>
                </div>
                <div class="order-summary">
                    Позиций: ${order.items.length} | Сумма: ${order.total_price} руб.
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке заказов:', error);
    }
}

function showOrderDetails(orderId) {
    // Remove selection from all orders
    document.querySelectorAll('.order-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to clicked order
    const selectedOrder = document.querySelector(`.order-item[data-order-id="${orderId}"]`);
    if (selectedOrder) {
        selectedOrder.classList.add('selected');
    }

    // Get and show order details
    fetch(`http://localhost:5001/order-details/${orderId}`)
        .then(response => response.json())
        .then(order => {
            const detailsContainer = document.getElementById('order-items-list');
            detailsContainer.innerHTML = `
                <h4>Заказ #${order.id} - Стол ${order.table_number}</h4>
                <div class="order-time">Создан: ${new Date(order.created_at).toLocaleString()}</div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-detail-item">
                            ${item.quantity}x ${item.name} - ${item.price * item.quantity} руб.
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">
                    <strong>Итого: ${order.total_price} руб.</strong>
                </div>
                <div class="order-actions">
                    <button class="pay-order-btn" onclick="showPaymentOptions(${order.id}, ${order.total_price})">Оплатить</button>
                    <button class="cancel-order-btn" onclick="cancelOrder(${order.id})">Отменить заказ</button>
                </div>
            `;
        })
        .catch(error => console.error('Ошибка при загрузке деталей заказа:', error));
}

async function showPaymentOptions(orderId, totalAmount) {
    const paymentMethod = confirm('Выберите способ оплаты:\nOK - Картой\nОтмена - Наличными');
    
    if (paymentMethod) {
        // Оплата картой
        if (confirm('Подтвердите оплату картой')) {
            await processPayment(orderId, totalAmount, 'card');
        }
    } else {
        // Оплата наличными
        const cashAmount = prompt(`Введите сумму полученных наличных (сумма заказа: ${totalAmount} руб.):`);
        if (cashAmount) {
            const amount = parseFloat(cashAmount);
            if (amount >= totalAmount) {
                const change = amount - totalAmount;
                if (change > 0) {
                    alert(`Сдача: ${change.toFixed(2)} руб.`);
                }
                await processPayment(orderId, totalAmount, 'cash');
            } else {
                alert('Недостаточная сумма!');
            }
        }
    }
}

async function processPayment(orderId, amount, method) {
    try {
        const response = await fetch(`http://localhost:5001/process-payment/${orderId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                payment_method: method
            })
        });

        if (response.ok) {
            alert('Оплата прошла успешно');
            await loadOrders(); // Перезагрузить список заказов
            document.getElementById('order-items-list').innerHTML = '<p>Выберите заказ для просмотра деталей</p>';
        } else {
            const error = await response.json();
            alert(error.error || 'Ошибка при оплате');
        }
    } catch (error) {
        console.error('Ошибка при обработке оплаты:', error);
        alert('Ошибка при обработке оплаты');
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Вы уверены, что хотите отменить заказ?')) {
        return;
    }

    const workerCode = prompt('Введите ваш код для подтверждения отмены заказа:');
    if (!workerCode) return;

    try {
        const response = await fetch(`http://localhost:5001/cancel-order/${orderId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ worker_code: workerCode })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Заказ успешно отменен');
            await loadOrders();
            document.getElementById('order-items-list').innerHTML = '<p>Выберите заказ для просмотра деталей</p>';
        } else {
            alert(result.error || 'Ошибка при отмене заказа');
        }
    } catch (error) {
        console.error('Ошибка при отмене заказа:', error);
        alert('Ошибка при отмене заказа');
    }
}

// Move loadTableStatuses to the global scope
async function loadTableStatuses() {
    const tables = document.querySelectorAll('.table');
    for (let table of tables) {
        const tableNumber = table.dataset.table;
        try {
            const reservationResponse = await fetch(`http://localhost:5001/reservations/${tableNumber}`);
            const reservations = await reservationResponse.json();
            
            const statusResponse = await fetch(`http://localhost:5001/table-status/${tableNumber}`);
            const tableStatus = await statusResponse.json();

            table.classList.remove('available', 'reserved', 'occupied');
            
            const now = new Date();
            const hasActiveReservation = reservations.some(res => {
                const resDate = new Date(res.date);
                return resDate >= now;
            });

            if (tableStatus.status === 'occupied') {
                table.classList.add('occupied');
            } else if (hasActiveReservation) {
                table.classList.add('reserved');
            } else {
                table.classList.add('available');
            }
        } catch (error) {
            console.error('Ошибка при загрузке статуса стола:', error);
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("register-form");

    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const position = document.getElementById("position").value;
            const fullname = document.getElementById("fullname").value;
            const workerCode = document.getElementById("worker-code").value;
            const adminCode = document.getElementById("admin-code").value;

            const requestData = {
                position: position,
                fullname: fullname,
                worker_code: workerCode,
                admin_code: adminCode
            };

            try {
                const response = await fetch("http://localhost:5001/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(requestData)
                });

                const result = await response.json();
                alert(result.message || result.error);

                if (response.ok) {
                    registerForm.reset();
                }
            } catch (error) {
                console.error("Ошибка при отправке запроса:", error);
                alert("Ошибка регистрации. Попробуйте позже.");
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab");

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            const target = this.getAttribute("data-tab");
            
            tabContents.forEach(content => {
                content.classList.remove("active");
            });
            
            document.getElementById(target).classList.add("active");
        });
    });

    // Проверяем роль пользователя
    const position = localStorage.getItem("position");
    console.log("Текущая должность:", position); // Проверка в консоли

    if (!position) {
        window.location.href = "index.html"; // Если нет должности — отправляем на вход
        return;
    }

    // Скрываем пункт "Регистрация пользователя" для официантов и поваров
    if (position === "Официант" || position === "Повар") {
        const registerTab = document.querySelector('.tab-button[data-tab="register"]');
        if (registerTab) {
            registerTab.style.display = "none";
        }
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const username = localStorage.getItem("username") || "Неизвестный";
    const position = localStorage.getItem("position") || "Нет данных";

    // Получаем текущее время входа
    let loginTime = localStorage.getItem("loginTime");

    if (!loginTime) {
        loginTime = new Date().toLocaleString();
        localStorage.setItem("loginTime", loginTime);
    }

    // Вставляем данные в блок user-info
    const userInfoDiv = document.getElementById("user-info");
    if (userInfoDiv) {
        userInfoDiv.innerHTML = `
            <p><strong>${position}</strong></p>
            <p><strong>${username}</strong></p>
            <p>Время входа: ${loginTime}</p>
        `;
    }

    // Логика выхода при клике на "Закрыть личную смену"
    document.querySelector('.tab-button[data-tab="shifts"]').addEventListener("click", () => {
        if (confirm("Вы уверены, что хотите закрыть личную смену и выйти?")) {
            localStorage.clear(); // Очищаем данные
            window.location.href = "index.html"; // Переход на страницу входа
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const position = localStorage.getItem("position");
    const categoryList = document.getElementById("category-list");

    // Показать форму добавления разделов и блюд для админов и менеджеров
    if (position === "Администратор" || position === "Менеджер") {
        document.getElementById("add-category-form").style.display = "block";
    }

    // Загрузка разделов меню
    async function loadCategories() {
        try {
            const response = await fetch("http://localhost:5001/categories");
            const categories = await response.json();

            categoryList.innerHTML = "";
            document.getElementById("dish-container").style.display = "none";

            categories.forEach(category => {
                const categoryBlock = document.createElement("div");
                categoryBlock.classList.add("category-block");
                categoryBlock.dataset.id = category.id;
                categoryBlock.dataset.name = category.name;
                
                // Добавляем кнопку удаления для админов и менеджеров
                const deleteButton = position === "Администратор" || position === "Менеджер" 
                    ? `<button class="delete-category-btn" onclick="event.stopPropagation();">❌</button>` 
                    : '';
                
                categoryBlock.innerHTML = `
                    ${deleteButton}
                    <h3>${category.name}</h3>
                `;

                // Обработчик удаления категории
                const delBtn = categoryBlock.querySelector('.delete-category-btn');
                if (delBtn) {
                    delBtn.addEventListener('click', async () => {
                        if (confirm(`Удалить категорию "${category.name}" и все блюда в ней?`)) {
                            try {
                                const response = await fetch(`http://localhost:5001/categories/${category.id}`, {
                                    method: 'DELETE'
                                });
                                if (response.ok) {
                                    loadCategories();
                                }
                            } catch (error) {
                                console.error("Ошибка при удалении категории:", error);
                            }
                        }
                    });
                }

                categoryBlock.addEventListener("click", () => {
                    document.getElementById("dish-container").style.display = "block";
                    document.getElementById("selected-category-name").textContent = category.name;
                    document.getElementById("parent-category-id").value = category.id;
                    loadDishes(category.id);
                });

                categoryList.appendChild(categoryBlock);
            });
        } catch (error) {
            console.error("Ошибка при загрузке категорий:", error);
        }
    }

    // Добавление нового раздела
    document.getElementById("add-category-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = document.getElementById("category-name").value;

        try {
            await fetch("http://localhost:5001/add-category", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            });

            document.getElementById("category-name").value = "";
            loadCategories();
        } catch (error) {
            console.error("Ошибка при добавлении раздела:", error);
        }
    });

    // Загрузка блюд из раздела
    async function loadDishes(categoryId) {
        try {
            const response = await fetch(`http://localhost:5001/dishes/${categoryId}`);
            const dishes = await response.json();
            
            const dishList = document.getElementById("dish-list");
            dishList.innerHTML = "";

            dishes.forEach(dish => {
                const dishElement = document.createElement("div");
                dishElement.classList.add("dish-item");
                dishElement.dataset.id = dish.id;
                
                // Добавляем кнопку удаления для админов и менеджеров
                const deleteButton = position === "Администратор" || position === "Менеджер" 
                    ? `<button class="delete-dish-btn">❌</button>` 
                    : '';
                
                dishElement.innerHTML = `
                    <div class="dish-content">
                        <p><strong>${dish.name}</strong> - ${dish.price} руб.</p>
                        ${deleteButton}
                    </div>
                `;

                // Обработчик удаления блюда
                const delBtn = dishElement.querySelector('.delete-dish-btn');
                if (delBtn) {
                    delBtn.addEventListener('click', async () => {
                        if (confirm(`Удалить блюдо "${dish.name}"?`)) {
                            try {
                                const response = await fetch(`http://localhost:5001/dishes/${dish.id}`, {
                                    method: 'DELETE'
                                });
                                if (response.ok) {
                                    dishElement.remove();
                                }
                            } catch (error) {
                                console.error("Ошибка при удалении блюда:", error);
                            }
                        }
                    });
                }

                dishList.appendChild(dishElement);
            });

            if (position === "Администратор" || position === "Менеджер") {
                document.getElementById("add-dish-form").style.display = "block";
            }
        } catch (error) {
            console.error("Ошибка при загрузке блюд:", error);
        }
    }

    // Добавление нового блюда
    document.getElementById("add-dish-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = document.getElementById("dish-name").value;
        const price = document.getElementById("dish-price").value;
        const categoryId = document.getElementById("parent-category-id").value;

        try {
            await fetch("http://localhost:5001/add-dish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, price, categoryId })
            });

            document.getElementById("add-dish-form").reset();
            loadDishes(categoryId);
        } catch (error) {
            console.error("Ошибка при добавлении блюда:", error);
        }
    });

    loadCategories();
});

document.addEventListener("DOMContentLoaded", function () {
    // Находим все столы
    const tables = document.querySelectorAll('.table');
    const reservationContainer = document.getElementById('reservation-container');
    const reservationForm = document.getElementById('reservation-form');

    // Функция загрузки всех бронирований и обновления вида столов
    async function loadTableStatuses() {
        for (let table of tables) {
            const tableNumber = table.dataset.table;
            try {
                // Получаем статус бронирования
                const reservationResponse = await fetch(`http://localhost:5001/reservations/${tableNumber}`);
                const reservations = await reservationResponse.json();
                
                // Получаем статус занятости
                const statusResponse = await fetch(`http://localhost:5001/table-status/${tableNumber}`);
                const tableStatus = await statusResponse.json();

                // Обновляем классы стола
                table.classList.remove('available', 'reserved', 'occupied');
                
                const now = new Date();
                const hasActiveReservation = reservations.some(res => {
                    const resDate = new Date(res.date);
                    return resDate >= now;
                });

                if (tableStatus.status === 'occupied') {
                    table.classList.add('occupied');
                } else if (hasActiveReservation) {
                    table.classList.add('reserved');
                } else {
                    table.classList.add('available');
                }
            } catch (error) {
                console.error('Ошибка при загрузке статуса стола:', error);
            }
        }
    }

    // Обновляем существующий обработчик клика
    tables.forEach(table => {
        table.addEventListener('click', async () => {
            const tableNumber = table.dataset.table;
            const userPosition = localStorage.getItem("position");
            const isAdmin = userPosition === "Администратор" || userPosition === "Менеджер";

            if (!table.classList.contains('reserved')) {
                const menuOptions = [
                    '2 - Отметить как занятый',
                    '3 - Отметить как свободный',
                    '4 - Создать заказ'
                ];

                if (isAdmin) {
                    menuOptions.unshift('1 - Забронировать стол');
                }

                const action = prompt(
                    'Выберите действие:\n' +
                    menuOptions.join('\n')
                );

                if (action === '4') {
                    await showOrderForm(tableNumber);
                    // Удаляем старый обработчик и добавляем новый
                    const submitBtn = document.getElementById('submit-order');
                    const submitHandler = submitBtn.getAttribute('data-handler');
                    if (submitHandler) {
                        submitBtn.removeEventListener('click', window[submitHandler]);
                    }

                    const newHandler = async () => {
                        const items = [];
                        document.querySelectorAll('.order-dish input[type="number"]').forEach(input => {
                            const quantity = parseInt(input.value);
                            if (quantity > 0) {
                                items.push({
                                    name: input.dataset.name,
                                    price: parseFloat(input.dataset.price),
                                    quantity: quantity
                                });
                            }
                        });

                        if (items.length === 0) {
                            alert('Добавьте хотя бы одно блюдо в заказ');
                            return;
                        }

                        try {
                            const response = await fetch(`http://localhost:5001/create-order/${tableNumber}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ items })
                            });

                            if (response.ok) {
                                alert('Заказ успешно создан');
                                closeOrderModal();
                                loadTableStatuses(); // Используем функцию из текущей области видимости
                            } else {
                                alert('Ошибка при создании заказа');
                            }
                        } catch (error) {
                            console.error('Ошибка при отправке заказа:', error);
                            alert('Ошибка при создании заказа');
                        }
                    };

                    // Сохраняем обработчик в window для возможности его удаления
                    const handlerId = 'submitOrder_' + Date.now();
                    window[handlerId] = newHandler;
                    submitBtn.setAttribute('data-handler', handlerId);
                    submitBtn.addEventListener('click', newHandler);
                    return;
                }

                if (action === '2') {
                    try {
                        await fetch(`http://localhost:5001/update-table-status/${tableNumber}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'occupied' })
                        });
                        await loadTableStatuses();
                        return;
                    } catch (error) {
                        console.error('Ошибка при обновлении статуса стола:', error);
                        return;
                    }
                } else if (action === '3') {
                    try {
                        await fetch(`http://localhost:5001/update-table-status/${tableNumber}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'available' })
                        });
                        await loadTableStatuses();
                        return;
                    } catch (error) {
                        console.error('Ошибка при обновлении статуса стола:', error);
                        return;
                    }
                }
                else if (action === '1' && isAdmin) {
                    showReservationModal(tableNumber);
                } else if (action === '1') {
                    alert('Только администраторы и менеджеры могут бронировать столы');
                }
            }
            // ...existing reserved table handling code...
        });
    });

    // Заменяем loadReservations на loadTableStatuses
    loadTableStatuses();

    // Обработчик клика по столу
    tables.forEach(table => {
        table.addEventListener('click', async () => {
            if (table.classList.contains('reserved')) {
                // Показываем информацию о бронировании
                const tableNumber = table.dataset.table;
                const response = await fetch(`http://localhost:5001/reservations/${tableNumber}`);
                const reservations = await response.json();
                
                if (reservations.length > 0) {
                    const nextReservation = reservations[0];
                    const message = `Стол забронирован\nГость: ${nextReservation.guest}\nВремя: ${new Date(nextReservation.date).toLocaleString()}\n\nХотите отменить бронирование?`;
                    
                    if (confirm(message)) {
                        const adminCode = prompt('Введите код администратора или менеджера для подтверждения:');
                        if (!adminCode) return;

                        try {
                            const cancelResponse = await fetch(`http://localhost:5001/cancel-reservation/${tableNumber}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    reservation_date: nextReservation.date,
                                    admin_code: adminCode
                                })
                            });

                            const result = await cancelResponse.json();
                            
                            if (cancelResponse.ok) {
                                alert('Бронирование отменено');
                                await loadTableStatuses();
                            } else {
                                alert(result.error || 'Ошибка при отмене бронирования');
                            }
                        } catch (error) {
                            console.error('Ошибка при отмене бронирования:', error);
                            alert('Ошибка при отмене бронирования');
                        }
                    }
                    return;
                }
            }

            // Если стол свободен, показываем форму бронирования
            const tableNumber = table.dataset.table;
            document.getElementById('selected-table-number').textContent = tableNumber;
            document.getElementById('table-number').value = tableNumber;
            reservationContainer.style.display = 'block';
            
            // Устанавливаем минимальную дату
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            document.getElementById('reservation-date').min = minDateTime;
        });
    });

    // Обновляем обработчик отправки формы
    reservationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const tableNumber = document.getElementById('table-number').value;
        const guestName = document.getElementById('guest-name').value;
        const reservationDate = document.getElementById('reservation-date').value;
        const workerCode = prompt('Введите ваш код для подтверждения бронирования:');
        
        if (!workerCode) return;

        try {
            const response = await fetch('http://localhost:5001/add-reservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table_number: tableNumber,
                    guest_name: guestName,
                    reservation_date: reservationDate,
                    worker_code: workerCode
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                reservationForm.reset();
                closeReservationModal();
                await loadTableStatuses();
            } else {
                alert(result.error || 'Ошибка при бронировании');
            }
        } catch (error) {
            console.error('Ошибка при отправке запроса:', error);
            alert('Ошибка при бронировании. Попробуйте позже.');
        }
    });
});

// Функция создания заказа
async function createOrder(tableNumber) {
    const orderItems = [];
    
    // Загружаем все категории и блюда
    const response = await fetch("http://localhost:5001/categories");
    const categories = await response.json();
    
    for (const category of categories) {
        const dishesResponse = await fetch(`http://localhost:5001/dishes/${category.id}`);
        const dishes = await dishesResponse.json();
        
        for (const dish of dishes) {
            const quantity = prompt(`Введите количество для "${dish.name}" (0 чтобы пропустить):`);
            if (quantity && parseInt(quantity) > 0) {
                orderItems.push({
                    name: dish.name,
                    price: dish.price,
                    quantity: parseInt(quantity)
                });
            }
        }
    }
    
    if (orderItems.length === 0) {
        alert('Заказ пуст');
        return null;
    }
    
    // Показываем итоговый заказ
    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const confirmation = confirm(
        'Подтвердите заказ:\n\n' +
        orderItems.map(item => `${item.quantity}x ${item.name} = ${item.price * item.quantity} руб.`).join('\n') +
        `\n\nИтого: ${total} руб.`
    );
    
    return confirmation ? { items: orderItems } : null;
}

// Добавляем функцию для создания формы заказа
async function showOrderForm(tableNumber) {
    const orderModal = document.getElementById('order-modal');
    const orderTableNumber = document.getElementById('order-table-number');
    const orderCategories = document.getElementById('order-categories');
    
    orderTableNumber.textContent = tableNumber;
    orderModal.style.display = 'flex';
    orderCategories.innerHTML = '';
    
    try {
        const response = await fetch('http://localhost:5001/categories');
        const categories = await response.json();
        
        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'order-category';
            categoryDiv.innerHTML = `
                <h4>${category.name}</h4>
                <div class="order-dishes" data-category="${category.id}"></div>
            `;
            
            categoryDiv.querySelector('h4').addEventListener('click', async () => {
                const dishesContainer = categoryDiv.querySelector('.order-dishes');
                if (dishesContainer.style.display === 'none' || !dishesContainer.style.display) {
                    // Загружаем блюда только при первом открытии категории
                    if (!dishesContainer.hasAttribute('data-loaded')) {
                        const dishesResponse = await fetch(`http://localhost:5001/dishes/${category.id}`);
                        const dishes = await dishesResponse.json();
                        
                        dishesContainer.innerHTML = dishes.map(dish => `
                            <div class="order-dish">
                                <span>${dish.name} - ${dish.price} руб.</span>
                                <input type="number" min="0" value="0" 
                                    data-name="${dish.name}" 
                                    data-price="${dish.price}"
                                    onchange="updateOrderSummary()">
                            </div>
                        `).join('');
                        
                        dishesContainer.setAttribute('data-loaded', 'true');
                    }
                    dishesContainer.style.display = 'block';
                } else {
                    dishesContainer.style.display = 'none';
                }
            });
            
            orderCategories.appendChild(categoryDiv);
        });
        
        document.getElementById('order-summary').style.display = 'block';
        
    } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for closing reservation modal
    document.getElementById('reservation-modal')?.addEventListener('click', (event) => {
        if (event.target === document.getElementById('reservation-modal')) {
            closeReservationModal();
        }
    });

    // Add event listener for closing order modal
    document.getElementById('order-modal')?.addEventListener('click', (event) => {
        if (event.target === document.getElementById('order-modal')) {
            closeOrderModal();
        }
    });

    // Add event listener for submit order button
    document.getElementById('submit-order')?.addEventListener('click', async () => {
        const items = [];
        document.querySelectorAll('.order-dish input[type="number"]').forEach(input => {
            const quantity = parseInt(input.value);
            if (quantity > 0) {
                items.push({
                    name: input.dataset.name,
                    price: parseFloat(input.dataset.price),
                    quantity: quantity
                });
            }
        });

        if (items.length === 0) {
            alert('Добавьте хотя бы одно блюдо в заказ');
            return;
        }

        try {
            const tableNumber = document.getElementById('order-table-number').textContent;
            const response = await fetch(`http://localhost:5001/create-order/${tableNumber}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            });

            if (response.ok) {
                alert('Заказ успешно создан');
                closeOrderModal();
                await loadTableStatuses();
            } else {
                alert('Ошибка при создании заказа');
            }
        } catch (error) {
            console.error('Ошибка при отправке заказа:', error);
            alert('Ошибка при создании заказа');
        }
    });
});

// Add this to your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...

    const createNewOrderBtn = document.getElementById('create-new-order');
    if (createNewOrderBtn) {
        createNewOrderBtn.addEventListener('click', async () => {
            document.getElementById('orders-modal').style.display = 'flex';
            const categoriesContainer = document.getElementById('orders-categories');
            categoriesContainer.innerHTML = '';
            
            try {
                const response = await fetch('http://localhost:5001/categories');
                const categories = await response.json();
                
                for (const category of categories) {
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'order-category';
                    categoryDiv.innerHTML = `
                        <h4>${category.name}</h4>
                        <div class="order-dishes" data-category="${category.id}"></div>
                    `;
                    
                    categoryDiv.querySelector('h4').addEventListener('click', async () => {
                        const dishesContainer = categoryDiv.querySelector('.order-dishes');
                        if (dishesContainer.style.display === 'none' || !dishesContainer.style.display) {
                            if (!dishesContainer.hasAttribute('data-loaded')) {
                                const dishesResponse = await fetch(`http://localhost:5001/dishes/${category.id}`);
                                const dishes = await dishesResponse.json();
                                
                                dishesContainer.innerHTML = dishes.map(dish => `
                                    <div class="order-dish">
                                        <span>${dish.name} - ${dish.price} руб.</span>
                                        <input type="number" min="0" value="0" 
                                            data-name="${dish.name}" 
                                            data-price="${dish.price}"
                                            onchange="updateOrdersSummary()">
                                    </div>
                                `).join('');
                                
                                dishesContainer.setAttribute('data-loaded', 'true');
                            }
                            dishesContainer.style.display = 'block';
                        } else {
                            dishesContainer.style.display = 'none';
                        }
                    });
                    
                    categoriesContainer.appendChild(categoryDiv);
                }
                
                document.getElementById('orders-summary').style.display = 'block';
                
            } catch (error) {
                console.error('Ошибка при загрузке категорий:', error);
            }
        });
    }

    // Add submit handler for new orders
    document.getElementById('submit-new-order')?.addEventListener('click', async () => {
        const tableNumber = document.getElementById('order-table-select').value;
        if (!tableNumber) {
            alert('Выберите номер стола');
            return;
        }

        const items = [];
        document.querySelectorAll('#orders-categories .order-dish input[type="number"]').forEach(input => {
            const quantity = parseInt(input.value);
            if (quantity > 0) {
                items.push({
                    name: input.dataset.name,
                    price: parseFloat(input.dataset.price),
                    quantity: quantity
                });
            }
        });

        if (items.length === 0) {
            alert('Добавьте хотя бы одно блюдо в заказ');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5001/create-order/${tableNumber}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            });

            if (response.ok) {
                alert('Заказ успешно создан');
                closeOrdersModal();
                await loadOrders();
            } else {
                alert('Ошибка при создании заказа');
            }
        } catch (error) {
            console.error('Ошибка при отправке заказа:', error);
            alert('Ошибка при создании заказа');
        }
    });

    // Load orders when switching to orders tab
    document.querySelector('.tab-button[data-tab="orders"]')?.addEventListener('click', loadOrders);
});





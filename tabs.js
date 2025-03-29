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

            categories.forEach(category => {
                const categoryBlock = document.createElement("div");
                categoryBlock.classList.add("category-block");
                categoryBlock.dataset.id = category.id;
                categoryBlock.innerHTML = `
                    <h3>${category.name}</h3>
                `;

                categoryBlock.addEventListener("click", () => {
                    loadDishes(category.id);
                });

                categoryList.appendChild(categoryBlock);
            });

            // Блок добавления нового раздела
            if (position === "Администратор" || position === "Менеджер") {
                const addBlock = document.createElement("div");
                addBlock.classList.add("category-block", "add-block");
                addBlock.innerHTML = "<h3>➕</h3>";
                addBlock.addEventListener("click", () => {
                    document.getElementById("add-category-form").style.display = "block";
                });
                categoryList.appendChild(addBlock);
            }
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

            document.getElementById("dish-list").innerHTML = dishes.map(dish =>
                `<p>${dish.name} - ${dish.price} руб.</p>`
            ).join("");

            // Показ формы добавления блюда
            if (position === "Администратор" || position === "Менеджер") {
                document.getElementById("add-dish-form").style.display = "block";
                document.getElementById("parent-category-id").value = categoryId;
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




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
    const username = localStorage.getItem("username") || "Гость";
    const position = localStorage.getItem("position") || "Неизвестно";

    const userInfo = document.getElementById("user-info");
    if (userInfo) {
        userInfo.textContent = `${username} (${position})`;
    }
});

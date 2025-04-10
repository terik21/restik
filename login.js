document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const code = document.getElementById('code').value.trim();

    if (!username || !code) {
        alert("Введите логин и код");
        return;
    }

    try {
        const response = await fetch("http://localhost:5001/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fullname: username,
                worker_code: code
            })
        });

        const result = await response.json();

        if (response.ok) {
            console.log("Ответ от сервера:", result); // Проверяем данные в консоли

            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("username", result.user.fullname);
            localStorage.setItem("position", result.user.position); // Теперь точно сохраняем должность

            window.location.href = "dashboard.html";
        } else {
            alert("Ошибка: " + result.error);
        }
    } catch (error) {
        console.error("Ошибка входа:", error);
        alert("Ошибка соединения с сервером.");
    }
});

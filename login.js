const customerForm = document.getElementById("customerLoginForm");
const customerRegisterForm = document.getElementById("customerRegisterForm");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const adminForm = document.getElementById("adminLoginForm");

function isStrongPassword(password) {
  return (
    typeof password === "string"
    && password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password)
  );
}

function strongPasswordMessage() {
  return "Password must be at least 8 characters and include uppercase, lowercase, number and special character.";
}

function resolveUserScope(user) {
  return String(user?.id || user?._id || user?.email || user?.mobile || "guest");
}

function cacheCustomerProfile(user) {
  if (!user || user.role !== "customer") return;
  const scopedKey = `fm_profile_${resolveUserScope(user)}`;
  const profile = {
    username: user.fullName || "",
    mobile: user.mobile || ""
  };
  localStorage.setItem(scopedKey, JSON.stringify(profile));
}


if (customerForm) {
  customerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(customerForm);
    const identifier = data.get("email").trim();
    const password = data.get("password");
    try {
      const payload = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password })
      });
      setSession(payload.accessToken, payload.user, payload.refreshToken, payload.expiresIn);
      cacheCustomerProfile(payload.user);
      window.location.href = "customer.html";
    } catch (error) {
      alert(error.message || "Invalid customer credentials.");
    }
  });
}

if (customerRegisterForm) {
  customerRegisterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(customerRegisterForm);
    const fullName = data.get("fullName").trim();
    const mobile = data.get("mobile").trim();
    const email = data.get("email").trim().toLowerCase();
    const password = data.get("password");
    const confirmPassword = data.get("confirmPassword");
    if (!fullName || !mobile || !email || !password || !confirmPassword) {
      alert("Please fill all required fields.");
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      alert("Mobile number must be exactly 10 digits.");
      return;
    }
    if (!isStrongPassword(password)) {
      alert(strongPasswordMessage());
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password, mobile })
      });
      cacheCustomerProfile({ fullName, mobile, role: "customer" });
      alert("Registration successful. Please login.");
      window.location.href = "customer-login.html";
    } catch (error) {
      alert(error.message || "Registration failed.");
    }
  });
}

if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(forgotPasswordForm);
    const identifier = data.get("identifier").trim();
    const password = data.get("password");
    const confirmPassword = data.get("confirmPassword");
    if (!identifier || !password || !confirmPassword) {
      alert("Please fill all required fields.");
      return;
    }
    if (!isStrongPassword(password)) {
      alert(strongPasswordMessage());
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ identifier, password })
      });
      alert("Password updated. Please login.");
      window.location.href = "customer-login.html";
    } catch (error) {
      alert(error.message || "Could not reset password.");
    }
  });
}

if (adminForm) {
  adminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(adminForm);
    const username = data.get("username").trim();
    const password = data.get("password");
    if (!username || !password) {
      alert("Please enter username and password.");
      return;
    }
    try {
      const payload = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setSession(payload.accessToken, payload.user, payload.refreshToken, payload.expiresIn);
      window.location.href = "admin.html";
    } catch (error) {
      alert("Invalid admin username or password.");
    }
  });
}

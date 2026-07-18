<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="bg-[#0A0A0F] text-[#F8FAFC] min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md" x-data="authForm()">
        {{-- Logo --}}
        <div class="text-center mb-10">
            <div class="text-5xl mb-3">🎬</div>
            <h1 class="text-2xl font-bold">AI Video Platform</h1>
            <p class="text-[#94A3B8] mt-2">Tạo video AI chuyên nghiệp</p>
        </div>

        {{-- Tabs --}}
        <div class="flex mb-6 bg-[#1A1A2E] rounded-lg p-1">
            <button @click="tab = 'login'" class="flex-1 py-2 text-sm font-medium rounded-md transition" :class="tab === 'login' ? 'bg-[#7C3AED] text-white' : 'text-[#94A3B8]'">Đăng nhập</button>
            <button @click="tab = 'register'" class="flex-1 py-2 text-sm font-medium rounded-md transition" :class="tab === 'register' ? 'bg-[#7C3AED] text-white' : 'text-[#94A3B8]'">Đăng ký</button>
        </div>

        {{-- Login --}}
        <form x-show="tab === 'login'" @submit.prevent="login()" class="bg-[#1A1A2E] rounded-xl border border-gray-800 p-6 space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Email</label>
                <input type="email" x-model="form.email" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-[#7C3AED] outline-none" required>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Mật khẩu</label>
                <input type="password" x-model="form.password" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-[#7C3AED] outline-none" required>
            </div>
            <button type="submit" :disabled="loading" class="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 rounded-lg font-medium text-sm transition">
                <span x-show="!loading">Đăng nhập</span>
                <span x-show="loading">⏳ Đang xử lý...</span>
            </button>
            <div x-show="error" x-cloak class="text-sm text-red-400 text-center" x-text="error"></div>
        </form>

        {{-- Register --}}
        <form x-show="tab === 'register'" @submit.prevent="register()" class="bg-[#1A1A2E] rounded-xl border border-gray-800 p-6 space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Tên</label>
                <input type="text" x-model="form.name" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-[#7C3AED] outline-none" required>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Email</label>
                <input type="email" x-model="form.email" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-[#7C3AED] outline-none" required>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Mật khẩu</label>
                <input type="password" x-model="form.password" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:border-[#7C3AED] outline-none" required minlength="8">
            </div>
            <button type="submit" :disabled="loading" class="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 rounded-lg font-medium text-sm transition">
                <span x-show="!loading">Đăng ký</span>
                <span x-show="loading">⏳ Đang xử lý...</span>
            </button>
            <div x-show="error" x-cloak class="text-sm text-red-400 text-center" x-text="error"></div>
        </form>
    </div>

    <script>
    function authForm() {
        return {
            tab: 'login',
            form: { name: '', email: '', password: '' },
            loading: false,
            error: '',
            async login() {
                this.loading = true; this.error = '';
                try {
                    const res = await fetch('/api/auth/login', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: this.form.email, password: this.form.password }),
                    });
                    const data = await res.json();
                    if (!res.ok) { this.error = data.error || 'Sai email hoặc mật khẩu'; return; }
                    // Save JWT to session
                    await fetch('/auth/save-token', {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': '{{ csrf_token() }}' },
                        body: JSON.stringify({ token: data.token }),
                    });
                    window.location.href = '/dashboard';
                } catch(e) { this.error = 'Không thể kết nối server'; }
                finally { this.loading = false; }
            },
            async register() {
                this.loading = true; this.error = '';
                try {
                    const res = await fetch('/api/auth/register', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...this.form, password_confirmation: this.form.password }),
                    });
                    const data = await res.json();
                    if (!res.ok) { this.error = data.error || 'Đăng ký thất bại'; return; }
                    await fetch('/auth/save-token', {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': '{{ csrf_token() }}' },
                        body: JSON.stringify({ token: data.token }),
                    });
                    window.location.href = '/dashboard';
                } catch(e) { this.error = 'Không thể kết nối server'; }
                finally { this.loading = false; }
            }
        }
    }
    </script>
</body>
</html>

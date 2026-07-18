<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'AI Video Platform') — {{ config('app.name') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body class="bg-[#0A0A0F] text-[#F8FAFC] font-sans antialiased">
    <div class="flex h-screen overflow-hidden" x-data="{ sidebarOpen: false }">
        {{-- Sidebar --}}
        <aside class="fixed inset-y-0 left-0 z-30 w-64 bg-[#1A1A2E] border-r border-gray-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto" :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'">
            <div class="flex items-center h-16 px-6 border-b border-gray-800">
                <span class="text-lg font-bold text-[#7C3AED]">🎬 AI Video</span>
            </div>
            <nav class="px-4 py-4 space-y-1">
                <a href="{{ route('dashboard') }}" class="flex items-center px-3 py-2.5 text-sm rounded-lg {{ request()->routeIs('dashboard') ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'text-[#94A3B8] hover:text-white hover:bg-white/5' }}">
                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    Dashboard
                </a>
                <a href="{{ route('studio') }}" class="flex items-center px-3 py-2.5 text-sm rounded-lg {{ request()->routeIs('studio') ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'text-[#94A3B8] hover:text-white hover:bg-white/5' }}">
                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    Video Studio
                </a>
                <a href="{{ route('videos.index') }}" class="flex items-center px-3 py-2.5 text-sm rounded-lg {{ request()->routeIs('videos.*') ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'text-[#94A3B8] hover:text-white hover:bg-white/5' }}">
                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                    My Videos
                </a>
                <a href="{{ route('credits') }}" class="flex items-center px-3 py-2.5 text-sm rounded-lg {{ request()->routeIs('credits') ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'text-[#94A3B8] hover:text-white hover:bg-white/5' }}">
                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Credits
                </a>
            </nav>
            <div class="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-gray-800">
                <a href="{{ route('logout') }}" class="flex items-center px-3 py-2.5 text-sm text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/5" onclick="event.preventDefault(); document.getElementById('logout-form').submit();">
                    <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    Đăng xuất
                </a>
                <form id="logout-form" action="{{ route('logout') }}" method="POST" class="hidden">@csrf</form>
            </div>
        </aside>

        {{-- Overlay --}}
        <div class="fixed inset-0 z-20 bg-black/50 lg:hidden" x-show="sidebarOpen" x-cloak @click="sidebarOpen = false"></div>

        {{-- Main --}}
        <div class="flex-1 flex flex-col min-w-0">
            {{-- Header --}}
            <header class="h-16 border-b border-gray-800 bg-[#1A1A2E]/50 backdrop-blur-sm flex items-center px-4 lg:px-6">
                <button class="lg:hidden mr-4 text-[#94A3B8]" @click="sidebarOpen = !sidebarOpen">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <div class="flex-1"></div>
                <div class="flex items-center gap-4">
                    <a href="{{ route('credits') }}" class="flex items-center gap-1.5 text-sm bg-[#7C3AED]/10 text-[#7C3AED] px-3 py-1.5 rounded-full">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span id="credit-display">{{ number_format(auth()->user()->credits ?? 0) }}</span>
                    </a>
                    <div class="text-sm text-[#94A3B8]">{{ auth()->user()?->name }}</div>
                </div>
            </header>

            {{-- Content --}}
            <main class="flex-1 overflow-y-auto p-4 lg:p-8">
                @yield('content')
            </main>
        </div>
    </div>

    @stack('scripts')
</body>
</html>

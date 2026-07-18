<?php
namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\CreditTransaction;
use App\Models\Plan;
use App\Models\RenderJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $recentJobs = RenderJob::forUser($user)->latest()->limit(5)->get();
        $totalVideos = RenderJob::forUser($user)->count();

        return view('dashboard.index', compact('recentJobs', 'totalVideos'));
    }
}

class StudioController extends Controller
{
    public function index()
    {
        return view('studio.index');
    }
}

class VideoController extends Controller
{
    public function index()
    {
        $jobs = RenderJob::forUser(auth()->user())
            ->with('assets')
            ->latest()
            ->paginate(12);
        return view('videos.index', compact('jobs'));
    }

    public function show($uuid)
    {
        $job = RenderJob::where('uuid', $uuid)
            ->with('assets')
            ->firstOrFail();
        abort_if($job->user_id !== auth()->id(), 403);
        return view('videos.show', compact('job'));
    }

    public function retry($uuid)
    {
        $job = RenderJob::where('uuid', $uuid)->firstOrFail();
        abort_if($job->user_id !== auth()->id(), 403);

        Http::withToken(session('jwt_token'))
            ->post(url('/api/render-jobs/' . $job->uuid . '/retry'));

        return redirect()->back()->with('success', 'Đang thử lại...');
    }

    public function cancel($uuid)
    {
        $job = RenderJob::where('uuid', $uuid)->firstOrFail();
        abort_if($job->user_id !== auth()->id(), 403);

        Http::withToken(session('jwt_token'))
            ->post(url('/api/render-jobs/' . $job->uuid . '/cancel'));

        return redirect()->back()->with('success', 'Đã huỷ job');
    }
}

class CreditController extends Controller
{
    public function index()
    {
        $plans = Plan::all();
        $transactions = CreditTransaction::where('user_id', auth()->id())
            ->latest()
            ->limit(50)
            ->get();
        return view('credits.index', compact('plans', 'transactions'));
    }
}

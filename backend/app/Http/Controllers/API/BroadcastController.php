<?php
namespace App\Http\Controllers\API;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Broadcast;

class BroadcastController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function authenticate(Request $request): Response
    {
        $channel = $request->channel_name;
        $socketId = $request->socket_id;

        if (str_starts_with($channel, 'private-user.')) {
            $channelUserUuid = Str::after($channel, 'private-user.');
            if ($channelUserUuid !== $request->user()->uuid) {
                return response('Unauthorized', 403);
            }
        }

        return response(Broadcast::auth($request));
    }
}

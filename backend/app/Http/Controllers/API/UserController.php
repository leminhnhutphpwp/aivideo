<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * @group Quản lý Người dùng
 * 
 * Các API endpoint để quản lý người dùng trong hệ thống.
 * 
 * @authenticated
 */
class UserController extends Controller
{
    /**
     * Danh sách người dùng
     * 
     * Lấy danh sách tất cả người dùng trong hệ thống với phân trang.
     * Yêu cầu xác thực và quyền truy cập phù hợp.
     * 
     * @queryParam page integer Số trang phân trang. Example: 1
     * @queryParam per_page integer Số lượng mục trên mỗi trang. Example: 15
     * @queryParam search string Từ khóa tìm kiếm người dùng. Example: nguyễn
     * 
     * @response {
     *   "data": [
     *     {
     *       "id": 1,
     *       "name": "Nguyễn Văn A",
     *       "email": "nguyenvana@example.com",
     *       "created_at": "2024-01-01T00:00:00.000000Z",
     *       "updated_at": "2024-01-01T00:00:00.000000Z"
     *     }
     *   ],
     *   "current_page": 1,
     *   "last_page": 1,
     *   "per_page": 15,
     *   "total": 1
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Only admin (super_admin) can list all users
        if (!$user->hasRole('super_admin')) {
            return $this->cleanPaginateResponse($request, User::where('id', $user->id), 1);
        }

        $query = User::query();

        if ($request->has('search')) {
            $search = str_replace(['%', '_'], ['\%', '\_'], $request->get('search'));
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
        }

        return $this->cleanPaginateResponse($request, $query, (int) $request->get('per_page', 15));
    }

    /**
     * Tạo người dùng mới
     * 
     * Tạo tài khoản người dùng mới với dữ liệu được cung cấp.
     * Yêu cầu xác thực và quyền truy cập phù hợp.
     * 
     * @bodyParam name string required Họ và tên đầy đủ của người dùng. Example: Nguyễn Văn A
     * @bodyParam email string required Địa chỉ email của người dùng. Phải là duy nhất. Example: nguyenvana@example.com
     * @bodyParam password string required Mật khẩu của người dùng. Tối thiểu 8 ký tự. Example: matkhau123
     * 
     * @response {
     *   "id": 1,
     *   "name": "Nguyễn Văn A",
     *   "email": "nguyenvana@example.com",
     *   "created_at": "2024-01-01T00:00:00.000000Z",
     *   "updated_at": "2024-01-01T00:00:00.000000Z"
     * }
     * 
     * @response 422 {
     *   "message": "Dữ liệu không hợp lệ.",
     *   "errors": {
     *     "email": ["Địa chỉ email đã tồn tại."]
     *   }
     * }
     */
    public function store(Request $request): JsonResponse
    {
        // Only super_admin can create users
        if (!$request->user()->hasRole('super_admin')) {
            return response()->json(['message' => 'Từ chối truy cập'], 403);
        }

         $validator = Validator::make($request->all(), [
             'name' => ['required', 'string', 'max:255'],
             'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
             'password' => ['required', Password::defaults()],
             'phone_number' => ['nullable', 'string', 'max:20'],
             'date_of_birth' => ['nullable', 'date'],
             'gender' => ['nullable', 'string', 'in:male,female,other'],
             'address' => ['nullable', 'string'],
             'blood_type' => ['nullable', 'string', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-'],
         ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors(),
            ], 422);
        }

         $user = User::create([
             'name' => $request->name,
             'email' => $request->email,
             'password' => Hash::make($request->password),
             'phone_number' => $request->phone_number,
             'date_of_birth' => $request->date_of_birth,
             'gender' => $request->gender,
             'address' => $request->address,
             'blood_type' => $request->blood_type,
         ]);

        $user->assignRole('panel_user');

        app(MailService::class)->sendToUser('welcome', $user, [
            'login_url' => url('/login'),
        ]);

        return response()->json(['success' => true, 'data' => $user], 201);
    }

    /**
     * Chi tiết người dùng
     * 
     * Lấy thông tin chi tiết về một người dùng cụ thể.
     * Yêu cầu xác thực và quyền truy cập phù hợp.
     * 
     * @urlParam id integer required ID của người dùng. Example: 1
     * 
     * @response {
     *   "id": 1,
     *   "name": "Nguyễn Văn A",
     *   "email": "nguyenvana@example.com",
     *   "created_at": "2024-01-01T00:00:00.000000Z",
     *   "updated_at": "2024-01-01T00:00:00.000000Z"
     * }
     * 
     * @response 404 {
     *   "message": "Không tìm thấy người dùng"
     * }
     */
    public function show(Request $request, User $user): JsonResponse
    {
        // Users can only view themselves unless they are admin
        if ($request->user()->id !== $user->id && !$request->user()->hasRole(['super_admin', 'panel_user'])) {
            return response()->json(['message' => 'Từ chối truy cập'], 403);
        }

        return response()->json(['success' => true, 'data' => $user]);
    }

    /**
     * Cập nhật người dùng
     * 
     * Cập nhật thông tin người dùng. Hỗ trợ cập nhật một phần.
     * Yêu cầu xác thực và quyền truy cập phù hợp.
     * 
     * @urlParam id integer required ID của người dùng. Example: 1
     * @bodyParam name string Họ và tên đầy đủ của người dùng. Example: Nguyễn Văn A
     * @bodyParam email string Địa chỉ email của người dùng. Phải là duy nhất. Example: nguyenvana@example.com
     * @bodyParam password string Mật khẩu mới của người dùng. Tối thiểu 8 ký tự. Example: matkhaumoi123
     * 
     * @response {
     *   "id": 1,
     *   "name": "Nguyễn Văn A",
     *   "email": "nguyenvana@example.com",
     *   "created_at": "2024-01-01T00:00:00.000000Z",
     *   "updated_at": "2024-01-02T00:00:00.000000Z"
     * }
     * 
     * @response 404 {
     *   "message": "Không tìm thấy người dùng"
     * }
     */
    public function update(Request $request, User $user): JsonResponse
    {
        // Users can only update themselves unless they are admin
        if ($request->user()->id !== $user->id && !$request->user()->hasRole(['super_admin', 'panel_user'])) {
            return response()->json(['message' => 'Từ chối truy cập'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', Password::defaults()],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors(),
            ], 422);
        }

         $updateData = $request->only(['name', 'email', 'phone_number', 'date_of_birth', 'gender', 'address']);

         // Username chỉ được set 1 lần, sau đó lock
         if ($request->has('username') && !$user->username) {
             $validator = Validator::make($request->only('username'), [
                 'username' => ['required', 'string', 'min:3', 'max:30', 'unique:users,username', 'regex:/^[a-zA-Z0-9_]+$/'],
             ]);
             if ($validator->fails()) {
                 return response()->json(['message' => 'Username không hợp lệ', 'errors' => $validator->errors()], 422);
             }
             $updateData['username'] = $request->username;
         }
         
         if ($request->has('password')) {
             $updateData['password'] = Hash::make($request->password);
         }

        $user->update($updateData);

        return response()->json(['success' => true, 'data' => $user]);
    }
}

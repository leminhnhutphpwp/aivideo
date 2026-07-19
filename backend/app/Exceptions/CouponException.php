<?php

namespace App\Exceptions;

use Exception;

/**
 * Thrown when a coupon cannot be redeemed / applied. The message is user-facing
 * (Vietnamese) and safe to return to the client with a 422.
 */
class CouponException extends Exception
{
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditPack extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'price',
        'credits',
        'label',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'integer',
        'credits' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}

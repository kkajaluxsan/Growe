<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TutorAvailability extends Model
{
    use HasUuids;

    protected $table = 'tutor_availability';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    const CREATED_AT = 'created_at';
    const UPDATED_AT = 'updated_at';

    protected $fillable = [
        'tutor_id',
        'available_date',
        'start_time',
        'end_time',
        'session_duration',
        'is_recurring',
        'max_students_per_slot',
    ];

    protected $casts = [
        'available_date' => 'date',
        'is_recurring' => 'boolean',
        'session_duration' => 'integer',
        'max_students_per_slot' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function tutor(): BelongsTo
    {
        return $this->belongsTo(TutorProfile::class, 'tutor_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'availability_id');
    }
}


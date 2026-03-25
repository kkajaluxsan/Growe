<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tutor_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id')->unique();
            $table->text('bio')->nullable();
            // Use raw statement to match existing schema exactly (TEXT[])
            $table->text('subjects')->nullable(); // placeholder; converted below
            $table->boolean('is_suspended')->default(false);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('user_id', 'idx_tutor_profiles_user_id');
            $table->index('is_suspended', 'idx_tutor_profiles_is_suspended');
        });

        // Convert placeholder to TEXT[] with default '{}'
        DB::statement("ALTER TABLE tutor_profiles ALTER COLUMN subjects TYPE TEXT[] USING '{}'::TEXT[]");
        DB::statement("ALTER TABLE tutor_profiles ALTER COLUMN subjects SET DEFAULT '{}'::TEXT[]");

        Schema::create('tutor_availability', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('tutor_id');
            $table->date('available_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('session_duration');
            $table->boolean('is_recurring')->default(false);
            $table->integer('max_students_per_slot')->default(1);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('tutor_id')->references('id')->on('tutor_profiles')->cascadeOnDelete();
            $table->index('tutor_id', 'idx_tutor_availability_tutor_id');
            $table->index('available_date', 'idx_tutor_availability_date');
            $table->index(['tutor_id', 'available_date'], 'idx_tutor_availability_tutor_date');
        });

        DB::statement("ALTER TABLE tutor_availability ADD CONSTRAINT valid_time_range CHECK (end_time > start_time)");
        DB::statement("ALTER TABLE tutor_availability ADD CONSTRAINT tutor_availability_session_duration_check CHECK (session_duration > 0 AND session_duration <= 480)");
        DB::statement("ALTER TABLE tutor_availability ADD CONSTRAINT tutor_availability_max_students_check CHECK (max_students_per_slot >= 1 AND max_students_per_slot <= 20)");

        Schema::create('bookings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('availability_id');
            $table->uuid('student_id');
            $table->timestampTz('start_time');
            $table->timestampTz('end_time');
            $table->string('status', 20)->default('pending');
            $table->decimal('reliability_score', 3, 2)->nullable();
            $table->timestampTz('reminder_sent_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('availability_id')->references('id')->on('tutor_availability')->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('availability_id', 'idx_bookings_availability_id');
            $table->index('student_id', 'idx_bookings_student_id');
            $table->index('status', 'idx_bookings_status');
            $table->index('start_time', 'idx_bookings_start_time');
            $table->index('end_time', 'idx_bookings_end_time');
        });

        DB::statement("ALTER TABLE bookings ADD CONSTRAINT valid_booking_times CHECK (end_time > start_time)");
        DB::statement("ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending','confirmed','cancelled','completed','no_show'))");
        DB::statement("CREATE INDEX IF NOT EXISTS idx_bookings_reminder ON bookings(start_time) WHERE status = 'confirmed' AND reminder_sent_at IS NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('tutor_availability');
        Schema::dropIfExists('tutor_profiles');
    }
};


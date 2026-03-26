<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('title', 255);
            $table->text('description');
            $table->string('status', 50)->default('pending');
            $table->integer('priority')->default(2);
            $table->timestampTz('deadline');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
            $table->timestampTz('deleted_at')->nullable();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('user_id', 'idx_assignments_user_id');
            $table->index('status', 'idx_assignments_status');
            $table->index('deadline', 'idx_assignments_deadline');
            $table->index('priority', 'idx_assignments_priority');
        });

        // Reflect 013_assignments_hardening.sql constraints
        DB::statement("ALTER TABLE assignments ADD CONSTRAINT assignments_status_check CHECK (status IN ('pending','in_progress','completed'))");
        DB::statement("ALTER TABLE assignments ADD CONSTRAINT assignments_priority_check CHECK (priority >= 1 AND priority <= 3)");
        DB::statement("CREATE INDEX IF NOT EXISTS idx_assignments_deleted_at ON assignments (deleted_at) WHERE deleted_at IS NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};


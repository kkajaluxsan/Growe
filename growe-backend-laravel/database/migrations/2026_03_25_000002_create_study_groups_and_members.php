<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('study_groups', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->uuid('creator_id');
            $table->integer('max_members')->default(10);
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('creator_id', 'idx_study_groups_creator_id');
        });

        DB::statement("ALTER TABLE study_groups ADD CONSTRAINT study_groups_max_members_check CHECK (max_members >= 2 AND max_members <= 100)");

        Schema::create('group_members', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('group_id');
            $table->uuid('user_id');
            $table->string('status', 20)->default('pending');
            $table->timestampTz('joined_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('group_id')->references('id')->on('study_groups')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['group_id', 'user_id']);
            $table->index('group_id', 'idx_group_members_group_id');
            $table->index('user_id', 'idx_group_members_user_id');
            $table->index('status', 'idx_group_members_status');
        });

        DB::statement("ALTER TABLE group_members ADD CONSTRAINT group_members_status_check CHECK (status IN ('pending','approved'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('group_members');
        Schema::dropIfExists('study_groups');
    }
};


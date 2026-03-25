<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('group_id');
            $table->string('title', 255)->default('Group Meeting');
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('ended_at')->nullable();
            $table->uuid('created_by');
            $table->timestampTz('scheduled_at')->nullable();
            $table->uuid('tutor_id')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('group_id')->references('id')->on('study_groups')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('tutor_id')->references('id')->on('tutor_profiles')->nullOnDelete();
            $table->index('group_id', 'idx_meetings_group_id');
            $table->index('created_by', 'idx_meetings_created_by');
            $table->index('scheduled_at', 'idx_meetings_scheduled_at');
            $table->index('tutor_id', 'idx_meetings_tutor_id');
        });

        Schema::create('meeting_participants', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('meeting_id');
            $table->uuid('user_id');
            $table->timestampTz('joined_at')->useCurrent();
            $table->timestampTz('left_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('meeting_id')->references('id')->on('meetings')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['meeting_id', 'user_id']);
            $table->index('meeting_id', 'idx_meeting_participants_meeting_id');
            $table->index('user_id', 'idx_meeting_participants_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_participants');
        Schema::dropIfExists('meetings');
    }
};


<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->uuid('user_id')->primary();
            $table->string('phone', 50)->nullable();
            $table->text('bio')->nullable();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('audit_log', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('actor_id')->nullable();
            $table->string('action', 100);
            $table->string('resource_type', 50)->nullable();
            $table->uuid('resource_id')->nullable();
            $table->jsonb('details')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            $table->index('actor_id', 'idx_audit_log_actor_id');
            $table->index('created_at', 'idx_audit_log_created_at');
            $table->index('action', 'idx_audit_log_action');
        });

        Schema::create('conversations', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('type', 20);
            $table->uuid('group_id')->nullable();
            $table->uuid('meeting_id')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('group_id')->references('id')->on('study_groups')->cascadeOnDelete();
            $table->foreign('meeting_id')->references('id')->on('meetings')->cascadeOnDelete();
            $table->index('type', 'idx_conversations_type');
            $table->index('group_id', 'idx_conversations_group_id');
            $table->index('meeting_id', 'idx_conversations_meeting_id');
        });

        DB::statement("ALTER TABLE conversations ADD CONSTRAINT conversations_type_check CHECK (type IN ('DIRECT','GROUP','MEETING'))");
        DB::statement("ALTER TABLE conversations ADD CONSTRAINT conversation_ref_check CHECK (
            (type = 'DIRECT' AND group_id IS NULL AND meeting_id IS NULL) OR
            (type = 'GROUP' AND group_id IS NOT NULL AND meeting_id IS NULL) OR
            (type = 'MEETING' AND meeting_id IS NOT NULL AND group_id IS NULL)
        )");

        Schema::create('conversation_participants', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('conversation_id');
            $table->uuid('user_id');
            $table->timestampTz('last_read_at')->nullable();
            $table->timestampTz('joined_at')->useCurrent();

            $table->foreign('conversation_id')->references('id')->on('conversations')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['conversation_id', 'user_id']);
            $table->index('conversation_id', 'idx_conversation_participants_conversation_id');
            $table->index('user_id', 'idx_conversation_participants_user_id');
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('conversation_id');
            $table->uuid('sender_id');
            $table->text('content');
            $table->string('message_type', 20)->default('TEXT');
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('edited_at')->nullable();
            $table->timestampTz('deleted_at')->nullable();

            $table->foreign('conversation_id')->references('id')->on('conversations')->cascadeOnDelete();
            $table->foreign('sender_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('conversation_id', 'idx_messages_conversation_id');
            $table->index(['conversation_id', 'created_at'], 'idx_messages_created_at');
            $table->index('sender_id', 'idx_messages_sender_id');
        });

        DB::statement("ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (message_type IN ('TEXT','SYSTEM'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversation_participants');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('audit_log');
        Schema::dropIfExists('user_profiles');
    }
};


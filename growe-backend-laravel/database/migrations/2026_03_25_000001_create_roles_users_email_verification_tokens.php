<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('name', 50)->unique();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();
        });

        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('email', 255)->unique();
            $table->string('password_hash', 255);
            $table->uuid('role_id');
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_active')->default(true);
            $table->string('display_name', 255)->nullable();
            $table->string('avatar_url', 512)->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent();

            $table->foreign('role_id')->references('id')->on('roles')->restrictOnDelete();
            $table->index('email', 'idx_users_email');
            $table->index('role_id', 'idx_users_role_id');
            $table->index('is_verified', 'idx_users_is_verified');
            $table->index('is_active', 'idx_users_is_active');
            $table->index('display_name', 'idx_users_display_name');
        });

        Schema::create('email_verification_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('token', 255)->nullable(); // token became nullable in 011
            $table->string('token_hash', 64)->nullable();
            $table->timestampTz('expires_at');
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique('token', 'idx_email_verification_tokens_token');
            $table->index('expires_at', 'idx_email_verification_tokens_expires_at');
            $table->index('user_id', 'idx_email_verification_tokens_user_id');
        });

        DB::statement('CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash) WHERE token_hash IS NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_tokens');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
    }
};


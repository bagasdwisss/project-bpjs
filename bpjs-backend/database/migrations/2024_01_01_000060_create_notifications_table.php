<?php
// database/migrations/2024_01_01_create_notifications_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateNotificationsTable extends Migration
{
    public function up()
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id('notification_id');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('title', 100);
            $table->text('message');
            $table->enum('type', ['reminder', 'announcement', 'alert'])->default('reminder');
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium');
            $table->date('due_date')->nullable();
            $table->json('recipients')->nullable(); // ['all', 'participants', 'coordinators']
            $table->boolean('is_read')->default(false);
            $table->timestamps();
            
            $table->index(['user_id', 'is_read']);
            $table->index(['due_date', 'type']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('notifications');
    }
}
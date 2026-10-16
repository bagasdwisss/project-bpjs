<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->unsignedBigInteger('batch_id')->nullable();
            $table->integer('duration')->nullable(); // durasi pelatihan dalam jam/menit
            $table->timestamps();

            $table->foreign('batch_id')->references('id')->on('batches')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};

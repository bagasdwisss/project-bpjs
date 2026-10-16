<?php
// database/migrations/2024_01_01_add_coordinator_to_users_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCoordinatorToUsersTable extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'coordinator_id')) {
                $table->foreignId('coordinator_id')->nullable()->constrained('users');
            }
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['coordinator_id']);
            $table->dropColumn('coordinator_id');
        });
    }
}
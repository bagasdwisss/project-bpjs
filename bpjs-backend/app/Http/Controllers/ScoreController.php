<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Score;
use App\Models\User;

class ScoreController extends Controller
{
    /**
     * Get user's scores
     */
    public function myScores(Request $request)
    {
        $user = $request->user();
        
        $scores = Score::where('user_id', $user->user_id)
            ->with('module') // Include module information
            ->orderBy('graded_at', 'desc')
            ->get();
            
        return response()->json([
            'success' => true,
            'data' => $scores
        ]);
    }

    /**
     * Get score statistics for user
     */
    public function myStatistics(Request $request)
    {
        $user = $request->user();
        
        $scores = Score::where('user_id', $user->user_id)->get();
        
        $average = $scores->count() > 0 ? round($scores->avg('score_value'), 2) : 0;
        $max = $scores->count() > 0 ? $scores->max('score_value') : 0;
        $min = $scores->count() > 0 ? $scores->min('score_value') : 0;
        $total = $scores->count();

        return response()->json([
            'success' => true,
            'data' => [
                'average' => $average,
                'max' => $max,
                'min' => $min,
                'total' => $total
            ]
        ]);
    }

    /**
     * Get participant scores for coordinator
     */
    public function getParticipantScores($id, Request $request)
    {
        $scores = Score::where('user_id', $id)
            ->with('module') // Include module information
            ->orderBy('graded_at', 'desc')
            ->get();
            
        return response()->json([
            'success' => true,
            'data' => $scores
        ]);
    }

    /**
     * Get participant attendance for coordinator
     */
    public function getParticipantAttendance($id, Request $request)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }
        
        $attendances = \App\Models\AttendanceRecord::where('user_id', $id)
            ->orderBy('attendance_date', 'desc')
            ->get();
            
        return response()->json([
            'success' => true,
            'data' => $attendances
        ]);
    }

    /**
     * Performance analysis for coordinator
     */
    public function performanceAnalysis(Request $request)
    {
        // Implementation for performance analysis
        return response()->json([
            'success' => true,
            'message' => 'Performance analysis will be implemented soon'
        ]);
    }
}
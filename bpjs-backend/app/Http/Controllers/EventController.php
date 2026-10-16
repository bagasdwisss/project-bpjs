<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Batch;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EventController extends Controller
{
    /**
     * Get events for participant
     */
    public function getParticipantEvents(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            // Get user's batch_id
            $batchId = $user->batch_id;
            
            // Get events for user's batch and general events (where batch_id is null)
            $events = Event::with(['batch', 'creator'])
                ->where(function($query) use ($batchId) {
                    $query->where('batch_id', $batchId)
                          ->orWhereNull('batch_id');
                })
                ->where('start_datetime', '>=', now()->subMonth()) // Show events from last month onwards
                ->orderBy('start_datetime', 'asc')
                ->get()
                ->map(function ($event) {
                    return [
                        'event_id' => $event->event_id,
                        'event_title' => $event->event_title,
                        'event_description' => $event->event_description,
                        'start_datetime' => $event->start_datetime->toISOString(),
                        'end_datetime' => $event->end_datetime->toISOString(),
                        'batch_name' => $event->batch ? $event->batch->batch_name : 'Semua Batch',
                        'created_by_name' => $event->creator ? $event->creator->full_name : 'System',
                        // Tambahkan field yang diharapkan oleh frontend
                        'batch_id' => $event->batch_id,
                        'created_by' => $event->created_by,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $events,
                'message' => 'Events retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve events',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get events for coordinator/admin
     */
    public function getEvents(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            
            $events = Event::with(['batch', 'creator'])
                ->orderBy('start_datetime', 'asc')
                ->get()
                ->map(function ($event) {
                    return [
                        'event_id' => $event->event_id,
                        'event_title' => $event->event_title,
                        'event_description' => $event->event_description,
                        'start_datetime' => $event->start_datetime->toISOString(),
                        'end_datetime' => $event->end_datetime->toISOString(),
                        'batch_name' => $event->batch ? $event->batch->batch_name : 'Semua Batch',
                        'created_by_name' => $event->creator ? $event->creator->full_name : 'System',
                        'batch_id' => $event->batch_id,
                        'created_by' => $event->created_by,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $events,
                'message' => 'Events retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve events',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new event
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'batch_id' => 'nullable|exists:batches,id',
                'event_title' => 'required|string|max:150',
                'event_description' => 'nullable|string',
                'start_datetime' => 'required|date',
                'end_datetime' => 'required|date|after:start_datetime',
            ]);

            $event = Event::create([
                ...$validated,
                'created_by' => $request->user()->id
            ]);

            // Load relationships for response
            $event->load(['batch', 'creator']);

            return response()->json([
                'success' => true,
                'data' => [
                    'event_id' => $event->event_id,
                    'event_title' => $event->event_title,
                    'event_description' => $event->event_description,
                    'start_datetime' => $event->start_datetime->toISOString(),
                    'end_datetime' => $event->end_datetime->toISOString(),
                    'batch_name' => $event->batch ? $event->batch->batch_name : 'Semua Batch',
                    'created_by_name' => $event->creator ? $event->creator->full_name : 'System',
                ],
                'message' => 'Event created successfully'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create event',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update event
     */
    public function update(Request $request, Event $event): JsonResponse
    {
        try {
            $validated = $request->validate([
                'batch_id' => 'nullable|exists:batches,id',
                'event_title' => 'sometimes|string|max:150',
                'event_description' => 'sometimes|string',
                'start_datetime' => 'sometimes|date',
                'end_datetime' => 'sometimes|date|after:start_datetime',
            ]);

            $event->update($validated);
            $event->load(['batch', 'creator']);

            return response()->json([
                'success' => true,
                'data' => [
                    'event_id' => $event->event_id,
                    'event_title' => $event->event_title,
                    'event_description' => $event->event_description,
                    'start_datetime' => $event->start_datetime->toISOString(),
                    'end_datetime' => $event->end_datetime->toISOString(),
                    'batch_name' => $event->batch ? $event->batch->batch_name : 'Semua Batch',
                    'created_by_name' => $event->creator ? $event->creator->full_name : 'System',
                ],
                'message' => 'Event updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update event',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete event
     */
    public function destroy(Event $event): JsonResponse
    {
        try {
            $event->delete();

            return response()->json([
                'success' => true,
                'message' => 'Event deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete event',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
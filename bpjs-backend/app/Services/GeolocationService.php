<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GeolocationService
{
    public function getAddressFromCoordinates($latitude, $longitude)
    {
        try {
            // Menggunakan Nominatim (OpenStreetMap) - Gratis
            $response = Http::timeout(10)->get('https://nominatim.openstreetmap.org/reverse', [
                'lat' => $latitude,
                'lon' => $longitude,
                'format' => 'json',
                'accept-language' => 'id',
                'zoom' => 18 // Level detail yang lebih tinggi
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $this->formatAddress($data);
            }

            return "Lokasi: {$latitude}, {$longitude}";

        } catch (\Exception $e) {
            return "Lokasi: {$latitude}, {$longitude}";
        }
    }

    private function formatAddress($data)
    {
        $address = $data['address'] ?? [];
        
        // Prioritaskan nama tempat yang lebih spesifik
        $components = [];
        
        if (!empty($address['name']) && $address['name'] !== $address['road']) {
            $components[] = $address['name'];
        }
        
        if (!empty($address['road'])) {
            $components[] = $address['road'];
        }
        
        if (!empty($address['suburb'])) {
            $components[] = $address['suburb'];
        }
        
        if (!empty($address['city_district'])) {
            $components[] = $address['city_district'];
        }
        
        if (!empty($address['city'])) {
            $components[] = $address['city'];
        }
        
        if (!empty($address['state'])) {
            $components[] = $address['state'];
        }
        
        if (!empty($address['postcode'])) {
            $components[] = $address['postcode'];
        }

        return implode(', ', $components);
    }
}
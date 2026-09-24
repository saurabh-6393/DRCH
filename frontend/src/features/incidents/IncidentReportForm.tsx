import React, { useState } from 'react';
import { submitIncident, IncidentReport } from '../../api/incidents';

const CATEGORIES = [
  { value: 'FLOOD', label: 'Flood' },
  { value: 'FIRE', label: 'Fire / Wildfire' },
  { value: 'EARTHQUAKE', label: 'Earthquake' },
  { value: 'LANDSLIDE', label: 'Landslide' },
  { value: 'OTHER', label: 'Other Emergency' },
];

export const IncidentReportForm: React.FC = () => {
  const [category, setCategory] = useState('FLOOD');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<IncidentReport | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Client-side file size check (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit. Please choose a smaller image.');
        setFile(null);
        setImagePreview(null);
        return;
      }

      setError(null);
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setError(null);
      },
      () => {
        setError('Unable to retrieve current location. Please enter coordinates manually.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessReport(null);

    if (!category) {
      setError('Please select an incident category.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description.');
      return;
    }
    if (!latitude || !longitude) {
      setError('Please provide latitude and longitude coordinates.');
      return;
    }
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Latitude must be a valid number between -90 and 90.');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setError('Longitude must be a valid number between -180 and 180.');
      return;
    }
    if (!file) {
      setError('Please attach photo evidence.');
      return;
    }

    setLoading(true);
    try {
      const report = await submitIncident({
        category,
        description,
        latitude: latNum,
        longitude: lngNum,
        file,
      });

      setSuccessReport(report);
      // Reset form
      setDescription('');
      setFile(null);
      setImagePreview(null);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Failed to submit incident report.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Report an Incident</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {successReport && (
        <div className="mb-6 p-4 bg-green-50 border border-green-300 rounded text-green-900">
          <h3 className="text-lg font-semibold mb-2">Report Submitted Successfully!</h3>
          <p className="text-sm">
            <strong>Incident ID:</strong> {successReport.id}
          </p>
          <p className="text-sm">
            <strong>Status:</strong>{' '}
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
              {successReport.status}
            </span>
          </p>
          <p className="text-sm mt-2">
            <strong>AI Consistency Priority:</strong>{' '}
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                successReport.aiVerification.verificationPriority === 'EXPEDITED'
                  ? 'bg-red-100 text-red-800'
                  : successReport.aiVerification.verificationPriority === 'AI_UNAVAILABLE'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {successReport.aiVerification.verificationPriority}
            </span>
          </p>
          <p className="text-sm text-gray-600 mt-1 italic">
            "{successReport.aiVerification.explanation}"
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe the situation, severity, and immediate dangers..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Location Coordinates
            </label>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="text-xs text-blue-600 hover:text-blue-800 underline focus:outline-none"
            >
              Use Current Location
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="number"
                step="any"
                placeholder="Latitude (e.g. 12.9716)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="number"
                step="any"
                placeholder="Longitude (e.g. 77.5946)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo Evidence (PNG, JPG, WEBP - Max 5MB)
          </label>
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {imagePreview && (
            <div className="mt-3">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="h-32 w-auto object-cover rounded border"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Submitting Report...' : 'Submit Incident Report'}
        </button>
      </form>
    </div>
  );
};

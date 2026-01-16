import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import {
  Trash2,
  Edit,
  X,
} from "lucide-react";
import { Routes, Route, useLocation } from "react-router-dom";

export default function NewClassForm({
    isScheduleModalOpen,
    setIsScheduleModalOpen, 
    classForm,
    setClassForm, 
    courses,
    editingClassId, 
    setEditingClassId,
    SESSION_TYPES,
    WEEK_DAYS,
    classes,
}){
    const handleClassInputChange = (e) => {
        const { name, value } = e.target;
        setClassForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleClassFormSubmit = (e) => {
        e.preventDefault();
        if (!classForm.courseId) return;
        const payload = {
            ...classForm,
            id: editingClassId ?? Date.now().toString(),
        };
        setClasses((prev) =>
            editingClassId ? prev.map((session) => (session.id === editingClassId ? payload : session)) : [payload, ...prev]
        );
        closeScheduleModal();
    };

    const handleDeleteClass = (id) => {
        setClasses((prev) => prev.filter((session) => session.id !== id));
        if (editingClassId === id) {
            closeScheduleModal();
        }
    };

    const startEditClass = (session) => {
    setEditingClassId(session.id);
    setClassForm({
      courseId: session.courseId,
      type: session.type,
      dayOfWeek: session.dayOfWeek,
      startTime: session.startTime,
      endTime: session.endTime,
      location: session.location,
    });
    setIsScheduleModalOpen(true);
  };

    const closeScheduleModal = () => {
        setIsScheduleModalOpen(false);
        setEditingClassId(null);
    };

    return(
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingClassId ? "Edit Class Session" : "Add Class Session"}
                </h3>
                <p className="text-sm text-gray-500">Customize the classes that appear on your weekly timetable.</p>
              </div>
              <button onClick={closeScheduleModal} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {courses.length === 0 ? (
              <p className="text-sm text-gray-600">Add a course first to start building your timetable.</p>
            ) : (
              <form onSubmit={handleClassFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select
                      name="courseId"
                      value={classForm.courseId}
                      onChange={handleClassInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code} — {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      name="type"
                      value={classForm.type}
                      onChange={handleClassInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 capitalize"
                    >
                      {SESSION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                    <select
                      name="dayOfWeek"
                      value={classForm.dayOfWeek}
                      onChange={handleClassInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      {WEEK_DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      name="location"
                      value={classForm.location}
                      onChange={handleClassInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      placeholder="Room 101"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      value={classForm.startTime}
                      onChange={handleClassInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      value={classForm.endTime}
                      onChange={handleClassInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  {editingClassId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClass(editingClassId)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
                  >
                    {editingClassId ? "Save Changes" : "Add Class"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Existing Sessions</h4>
              {classes.length === 0 ? (
                <p className="text-sm text-gray-500">No sessions yet. Use the form above to get started.</p>
              ) : (
                <div className="space-y-3">
                  {classes.map((session) => {
                    const course = courses.find((course) => course.id === session.courseId);
                    return (
                      <div
                        key={session.id}
                        className="border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {course?.code} · {session.type} on {session.dayOfWeek}
                          </p>
                          <p className="text-xs text-gray-500">
                            {session.startTime} - {session.endTime} · {session.location}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditClass(session)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                            type="button"
                          >
                            <Edit className="w-4 h-4 text-blue-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(session.id)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                            type="button"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
    );
}

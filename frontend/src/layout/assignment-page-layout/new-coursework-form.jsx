import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import {
  Trash2,
  Edit,
  X,
} from "lucide-react";
import { Routes, Route, useLocation } from "react-router-dom";
import axios from  "axios"

export default function NewCWForm({
    openAssignmentModal, 
    closeAssignmentModal, 
    editingAssignmentId, 
    setEditingAssignmentId, 
    courses, 
    assignmentForm, 
    setAssignmentForm,
    setAssignments,
    isAssignmentModalOpen,
    setIsAssignmentModalOpen,
}){
    const handleAssignmentSubmit = async(e) => {
    e.preventDefault();
    if (!assignmentForm.title.trim()) {
      alert("Assignment title is required.");
      return;
    }
    if (!assignmentForm.courseId) {
      alert("Select a course for the assignment.");
      return;
    }

    const base = {
      ...assignmentForm,
      title: assignmentForm.title.trim(),
      description: assignmentForm.description.trim(),
    };

    //retrieve course ID from database//

    //assignment obj to be fetch to database courseworks table//
    const assignment_obj={
      course_id: assignmentForm.courseId,
      cw_name: assignmentForm.title.trim(),
      cw_grade: null,
      cw_weight: assignmentForm.weight,
      duedate: assignmentForm.dueDate ? new Date(assignmentForm.dueDate) : null,
      description: assignmentForm.description.trim(),
      type: assignmentForm.type.trim(),
      priority: assignmentForm.priority,
      status: assignmentForm.status,
    };

    if (editingAssignmentId) {
      setAssignments((prev) => prev.map((a) => (a.id === editingAssignmentId ? { ...base, id: editingAssignmentId } : a)));
    } else {
      setAssignments((prev) => [{ ...base, id: Date.now().toString() }, ...prev]);
    }
    setIsAssignmentModalOpen(false);
    setEditingAssignmentId(null);

    try{
      const response = await axios.post("http://localhost:3000/api/coursework",assignment_obj);
      alert("created the obj");
      const storedCW = response.data;
      alert("successful");
    }catch(error){
      console.log("status", error.response?.status);
      console.log("data", error.response?.data);
      console.log("headers", error.response?.headers);
    }
    //setCW((prev) => [...res.data, ...prev]);
    };

    const handleAssignmentInputChange = (e) => {
    const { name, value } = e.target;
    setAssignmentForm((prev) => ({
      ...prev,
      [name]: name === "weight" ? Number(value) : value,
    }));
  };
    return(
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
                  <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {editingAssignmentId ? "Edit Assignment" : "New Assignment"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Track a task, exam, or project with a due date.
                        </p>
                      </div>
                      <button onClick={closeAssignmentModal} className="p-2 rounded-full hover:bg-gray-100">
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    {courses.length === 0 ? (
                      <p className="text-sm text-gray-600">Add a course first before creating assignments.</p>
                    ) : (
                      <form className="space-y-4" onSubmit={handleAssignmentSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                            <select
                              name="courseId"
                              value={assignmentForm.courseId}
                              onChange={handleAssignmentInputChange}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            >
                              {courses.map((course) => (
                                <option key={course.id} value={course._id}>
                                  {course.code} — {course.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                              type="date"
                              name="dueDate"
                              value={assignmentForm.dueDate}
                              onChange={handleAssignmentInputChange}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            name="title"
                            value={assignmentForm.title}
                            onChange={handleAssignmentInputChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            placeholder="Midterm project"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            name="description"
                            value={assignmentForm.description}
                            onChange={handleAssignmentInputChange}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            rows="3"
                            placeholder="Optional details, requirements, etc."
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                              name="priority"
                              value={assignmentForm.priority}
                              onChange={handleAssignmentInputChange}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              name="type"
                              value={assignmentForm.type}
                              onChange={handleAssignmentInputChange}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            >
                              <option value="assignment">Assignment</option>
                              <option value="project">Project</option>
                              <option value="exam">Exam</option>
                              <option value="lab">Lab</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (%)</label>
                            <input
                              type="number"
                              name="weight"
                              min="0"
                              max="100"
                              value={assignmentForm.weight}
                              onChange={handleAssignmentInputChange}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              name="status"
                              value={assignmentForm.status}
                              onChange={handleAssignmentInputChange}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            >
                              <option value="not_started">Not_Started</option>
                              <option value="in_progress">In_Progress</option>
                              <option value="completed">Completed</option>
                              <option value="overdue">Overdue</option>"
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <button type="button" onClick={closeAssignmentModal} className="px-4 py-2 rounded-lg border border-gray-300">
                            Cancel
                          </button>
                          <button type="submit" className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold">
                            Add Assignment
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
    )
};
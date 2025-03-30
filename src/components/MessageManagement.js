import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/authContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const MessageManagement = () => {
    const { userdata } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        image: null,
        populate_date: new Date(),
    });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10
    });
    const [sorting, setSorting] = useState({
        field: 'created_at',
        order: 'desc'
    });

    // Fetch messages
    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5001/messages`, {
                params: {
                    page: pagination.currentPage,
                    limit: pagination.itemsPerPage,
                    sort_by: sorting.field,
                    sort_order: sorting.order
                },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            setMessages(response.data.messages || []);
            setPagination(prev => ({
                ...prev,
                totalPages: Math.ceil(response.data.total / pagination.itemsPerPage),
                totalItems: response.data.total
            }));
            setError(null);
        } catch (err) {
            setError("Failed to fetch messages. Please try again later.");
            console.error("Error fetching messages:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch members for send_to field
    const fetchMembers = async () => {
        try {
            const response = await axios.get(`http://localhost:5001/messages/members`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            setMembers(response.data.members || []);
        } catch (err) {
            console.error("Error fetching members:", err);
        }
    };

    useEffect(() => {
        fetchMessages();
        fetchMembers();
    }, [pagination.currentPage, sorting]);

    const handleSort = (field) => {
        setSorting(prev => ({
            field,
            order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'image') {
            setFormData(prev => ({ ...prev, [name]: files[0] }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleMemberSelect = (memberId) => {
        setSelectedMembers(prev => {
            if (prev.includes(memberId)) {
                return prev.filter(id => id !== memberId);
            }
            return [...prev, memberId];
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('subject', formData.subject);
            formDataToSend.append('message', formData.message);
            formDataToSend.append('populate_date', formData.populate_date.toISOString());
            formDataToSend.append('send_to', JSON.stringify(selectedMembers));
            if (formData.image) {
                formDataToSend.append('image', formData.image);
            }

            await axios.post(`http://localhost:5001/messages`, formDataToSend, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setShowModal(false);
            fetchMessages();
            setFormData({
                subject: '',
                message: '',
                image: null,
                populate_date: new Date()
            });
            setSelectedMembers([]);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to create message");
        }
    };

    const getSortIcon = (field) => {
        if (sorting.field !== field) return '↕️';
        return sorting.order === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="mb-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Messages</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Add Message
                </button>
            </div>

            {/* Message List */}
            <div className="bg-white shadow-lg rounded-lg p-4">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <>
                        <table className="min-w-full table-auto border-collapse">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="p-2 border cursor-pointer" onClick={() => handleSort('subject')}>
                                        Subject {getSortIcon('subject')}
                                    </th>
                                    <th className="p-2 border cursor-pointer" onClick={() => handleSort('created_by')}>
                                        Created By {getSortIcon('created_by')}
                                    </th>
                                    <th className="p-2 border cursor-pointer" onClick={() => handleSort('created_at')}>
                                        Created Date {getSortIcon('created_at')}
                                    </th>
                                    <th className="p-2 border cursor-pointer" onClick={() => handleSort('populate_date')}>
                                        Populate Date {getSortIcon('populate_date')}
                                    </th>
                                    <th className="p-2 border">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.map((msg) => (
                                    <tr key={msg.id} className="border">
                                        <td className="p-2 border">{msg.subject}</td>
                                        <td className="p-2 border">{msg.created_by}</td>
                                        <td className="p-2 border">{new Date(msg.created_at).toLocaleDateString()}</td>
                                        <td className="p-2 border">{new Date(msg.populate_date).toLocaleDateString()}</td>
                                        <td className="p-2 border">
                                            <button className="text-blue-500 hover:text-blue-700">View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="mt-4 flex justify-between items-center">
                            <div>
                                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{" "}
                                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{" "}
                                {pagination.totalItems} entries
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                                    disabled={pagination.currentPage === 1}
                                    className="px-3 py-1 border rounded disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                                    disabled={pagination.currentPage === pagination.totalPages}
                                    className="px-3 py-1 border rounded disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add Message Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
                        <h2 className="text-xl font-bold mb-4">Add New Message</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block mb-1">Subject</label>
                                <input
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    className="w-full border rounded p-2"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-1">Message *</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full border rounded p-2"
                                    rows="4"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-1">Image</label>
                                <input
                                    type="file"
                                    name="image"
                                    onChange={handleInputChange}
                                    accept="image/jpeg,image/png"
                                    className="w-full border rounded p-2"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-1">Populate Date *</label>
                                <DatePicker
                                    selected={formData.populate_date}
                                    onChange={date => setFormData(prev => ({ ...prev, populate_date: date }))}
                                    className="w-full border rounded p-2"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block mb-1">Send To</label>
                                <div className="max-h-40 overflow-y-auto border rounded p-2">
                                    {members.map(member => (
                                        <div key={member.id} className="flex items-center gap-2 p-1">
                                            <input
                                                type="checkbox"
                                                id={`member-${member.id}`}
                                                checked={selectedMembers.includes(member.id)}
                                                onChange={() => handleMemberSelect(member.id)}
                                            />
                                            <label htmlFor={`member-${member.id}`}>
                                                {member.name} ({member.email})
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageManagement;

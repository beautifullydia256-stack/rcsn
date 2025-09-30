"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface Book {
  id: string;
  school_id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  published_year: number | null;
  category: string | null;
  shelf_location: string | null;
  cover_url: string | null;
  description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface BookCopy {
  id: string;
  school_id: string;
  book_id: string;
  copy_number: number;
  barcode: string | null;
  status: string;
  condition: string | null;
  acquired_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function BookManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    publisher: "",
    published_year: "",
    category: "",
    shelf_location: "",
    isbn: "",
    description: "",
    tags: "",
  });

  const categories = [
    "Fiction", "Non-Fiction", "Science", "Mathematics", "History", 
    "Literature", "Art", "Music", "Sports", "Technology", "Biography", "Other"
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData?.school_id) {
          setError('Unable to determine school');
          return;
        }

        setSchoolId(userData.school_id);
        await fetchBooks(userData.school_id);
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Failed to load books');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchBooks = async (schoolId: string) => {
    try {
      const { data: booksData, error: booksError } = await supabase
        .from('library_books')
        .select('*')
        .eq('school_id', schoolId)
        .order('title');

      if (booksError) {
        console.error('Error fetching books:', booksError);
        return;
      }

      setBooks(booksData || []);

      // Fetch copies for all books
      if (booksData && booksData.length > 0) {
        const bookIds = booksData.map(book => book.id);
        const { data: copiesData, error: copiesError } = await supabase
          .from('library_book_copies')
          .select('*')
          .in('book_id', bookIds);

        if (copiesError) {
          console.error('Error fetching copies:', copiesError);
        } else {
          setBookCopies(copiesData || []);
        }
      }
    } catch (err) {
      console.error('Error fetching books:', err);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;

    try {
      const tagsArray = formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [];
      
      const { data, error } = await supabase
        .from('library_books')
        .insert({
          school_id: schoolId,
          title: formData.title,
          author: formData.author || null,
          publisher: formData.publisher || null,
          published_year: formData.published_year ? parseInt(formData.published_year) : null,
          category: formData.category || null,
          shelf_location: formData.shelf_location || null,
          isbn: formData.isbn || null,
          description: formData.description || null,
          tags: tagsArray,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding book:', error);
        setError('Failed to add book');
        return;
      }

      // Upload cover if provided
      if (coverFile) {
        const path = `${schoolId}/${data.id}-${Date.now()}-${coverFile.name}`;
        const { error: upErr } = await supabase.storage.from('library-covers').upload(path, coverFile, { upsert: false });
        if (!upErr) {
          const { data: pub } = supabase.storage.from('library-covers').getPublicUrl(path);
          const coverUrl = pub?.publicUrl || null;
          if (coverUrl) {
            await supabase.from('library_books').update({ cover_url: coverUrl }).eq('id', data.id);
          }
        } else {
          console.warn('Cover upload failed:', upErr.message);
        }
      }

      // Add a default copy
      const { error: copyError } = await supabase
        .from('library_book_copies')
        .insert({
          school_id: schoolId,
          book_id: data.id,
          copy_number: 1,
          barcode: `BC-${data.id.substring(0, 8)}`,
          status: 'available',
          condition: 'good',
          acquired_at: new Date().toISOString(),
        });

      if (copyError) {
        console.error('Error adding copy:', copyError);
      }

      setShowAddBook(false);
      resetForm();
      setCoverFile(null);
      await fetchBooks(schoolId);
    } catch (err) {
      console.error('Error adding book:', err);
      setError('Failed to add book');
    }
  };

  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !schoolId) return;

    try {
      const tagsArray = formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [];
      
      const { error } = await supabase
        .from('library_books')
        .update({
          title: formData.title,
          author: formData.author || null,
          publisher: formData.publisher || null,
          published_year: formData.published_year ? parseInt(formData.published_year) : null,
          category: formData.category || null,
          shelf_location: formData.shelf_location || null,
          isbn: formData.isbn || null,
          description: formData.description || null,
          tags: tagsArray,
        })
        .eq('id', editingBook.id);

      if (error) {
        console.error('Error updating book:', error);
        setError('Failed to update book');
        return;
      }

      // Upload new cover if provided
      if (coverFile) {
        const path = `${schoolId}/${editingBook.id}-${Date.now()}-${coverFile.name}`;
        const { error: upErr } = await supabase.storage.from('library-covers').upload(path, coverFile, { upsert: false });
        if (!upErr) {
          const { data: pub } = supabase.storage.from('library-covers').getPublicUrl(path);
          const coverUrl = pub?.publicUrl || null;
          if (coverUrl) {
            await supabase.from('library_books').update({ cover_url: coverUrl }).eq('id', editingBook.id);
          }
        } else {
          console.warn('Cover upload failed:', upErr.message);
        }
      }

      setEditingBook(null);
      resetForm();
      setCoverFile(null);
      await fetchBooks(schoolId);
    } catch (err) {
      console.error('Error updating book:', err);
      setError('Failed to update book');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book? This will also delete all copies.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('library_books')
        .delete()
        .eq('id', bookId);

      if (error) {
        console.error('Error deleting book:', error);
        setError('Failed to delete book');
        return;
      }

      await fetchBooks(schoolId!);
    } catch (err) {
      console.error('Error deleting book:', err);
      setError('Failed to delete book');
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      author: "",
      publisher: "",
      published_year: "",
      category: "",
      shelf_location: "",
      isbn: "",
      description: "",
      tags: "",
    });
  };

  const startEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author || "",
      publisher: book.publisher || "",
      published_year: book.published_year?.toString() || "",
      category: book.category || "",
      shelf_location: book.shelf_location || "",
      isbn: book.isbn || "",
      description: book.description || "",
      tags: book.tags.join(', '),
    });
    setShowAddBook(true);
  };

  const getCopiesForBook = (bookId: string) => {
    return bookCopies.filter(copy => copy.book_id === bookId);
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-3xl font-bold">Book Management</h1>
              <p className="text-white/80 text-sm mt-1">Manage your library's book collection</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard/librarian')}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  setEditingBook(null);
                  resetForm();
                  setShowAddBook(true);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add Book
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search books by title or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Add/Edit Book Modal */}
        {showAddBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-white text-xl font-bold mb-4">
                {editingBook ? 'Edit Book' : 'Add New Book'}
              </h2>
              
              <form onSubmit={editingBook ? handleEditBook : handleAddBook} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Author</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Publisher</label>
                    <input
                      type="text"
                      value={formData.publisher}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Published Year</label>
                    <input
                      type="number"
                      value={formData.published_year}
                      onChange={(e) => setFormData({ ...formData, published_year: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Shelf Location</label>
                    <input
                      type="text"
                      value={formData.shelf_location}
                      onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">ISBN</label>
                    <input
                      type="text"
                      value={formData.isbn}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="fiction, classic, literature"
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Cover Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="w-full text-white/80"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingBook ? 'Update Book' : 'Add Book'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBook(false);
                      setEditingBook(null);
                      resetForm();
                    }}
                    className="px-6 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Books List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70 text-lg">No books found</p>
              <p className="text-white/50 text-sm mt-2">
                {searchTerm || selectedCategory ? 'Try adjusting your search criteria' : 'Add your first book to get started'}
              </p>
            </div>
          ) : (
            filteredBooks.map((book) => {
              const copies = getCopiesForBook(book.id);
              const availableCopies = copies.filter(copy => copy.status === 'available').length;
              const totalCopies = copies.length;

              return (
                <div
                  key={book.id}
                  className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 flex gap-4">
                      {book.cover_url && (
                        <img src={book.cover_url} alt={book.title} className="w-16 h-20 object-cover rounded-md border border-white/10" />
                      )}
                      <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{book.title}</h3>
                        {book.category && (
                          <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                            {book.category}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/70">
                        {book.author && (
                          <div>
                            <span className="font-medium">Author:</span> {book.author}
                          </div>
                        )}
                        {book.publisher && (
                          <div>
                            <span className="font-medium">Publisher:</span> {book.publisher}
                          </div>
                        )}
                        {book.published_year && (
                          <div>
                            <span className="font-medium">Year:</span> {book.published_year}
                          </div>
                        )}
                        {book.shelf_location && (
                          <div>
                            <span className="font-medium">Shelf:</span> {book.shelf_location}
                          </div>
                        )}
                        {book.isbn && (
                          <div>
                            <span className="font-medium">ISBN:</span> {book.isbn}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Copies:</span> {availableCopies}/{totalCopies} available
                        </div>
                      </div>

                      {book.description && (
                        <p className="text-sm text-white/60 mt-3 line-clamp-2">{book.description}</p>
                      )}

                      {book.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {book.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 rounded bg-white/5 text-white/70 text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(book)}
                        className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
}

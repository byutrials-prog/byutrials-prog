// Firebase Firestore Service Layer
// ==================================
// Semua operasi CRUD ke Firestore dilakukan di sini.
// Menggunakan real-time listeners (onSnapshot) agar data otomatis sync.

import { db, authReady } from './firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

// ==========================================
// Collection References
// ==========================================
const productsCol = collection(db, 'products');
const transactionsCol = collection(db, 'transactions');
const mutationsCol = collection(db, 'mutations');
const usersCol = collection(db, 'users');
const customersCol = collection(db, 'customers');
const metaCol = collection(db, 'meta');

// ==========================================
// Helper: Convert Firestore Timestamp to JS Date
// ==========================================
const convertTimestamps = (data) => {
  const converted = { ...data };
  if (converted.date && converted.date.toDate) {
    converted.date = converted.date.toDate();
  }
  return converted;
};

// ==========================================
// Real-time Subscriptions (onSnapshot)
// ==========================================

/**
 * Subscribe to products collection in real-time
 * @param {Function} callback - receives array of products
 * @returns {Function} unsubscribe function
 */
export const subscribeToProducts = (callback, onError) => {
  return onSnapshot(productsCol, (snapshot) => {
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    // Sort by id for consistent ordering
    products.sort((a, b) => {
      const numA = parseInt(a.id.replace('P', ''));
      const numB = parseInt(b.id.replace('P', ''));
      return numA - numB;
    });
    callback(products);
  }, onError);
};

/**
 * Subscribe to transactions collection in real-time
 * @param {Function} callback - receives array of transactions
 * @returns {Function} unsubscribe function
 */
export const subscribeToTransactions = (callback, onError) => {
  return onSnapshot(transactionsCol, (snapshot) => {
    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamps(doc.data()),
    }));
    // Sort newest first
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    callback(transactions);
  }, onError);
};

/**
 * Subscribe to mutations collection in real-time
 * @param {Function} callback - receives array of mutations
 * @returns {Function} unsubscribe function
 */
export const subscribeToMutations = (callback, onError) => {
  return onSnapshot(mutationsCol, (snapshot) => {
    const mutations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...convertTimestamps(doc.data()),
    }));
    // Sort newest first
    mutations.sort((a, b) => new Date(b.date) - new Date(a.date));
    callback(mutations);
  }, onError);
};

/**
 * Subscribe to users collection in real-time
 * @param {Function} callback - receives array of users
 * @returns {Function} unsubscribe function
 */
export const subscribeToUsers = (callback, onError) => {
  return onSnapshot(usersCol, (snapshot) => {
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    users.sort((a, b) => {
      const numA = parseInt(a.id.replace('U', ''));
      const numB = parseInt(b.id.replace('U', ''));
      return numA - numB;
    });
    callback(users);
  }, onError);
};

export const subscribeToCustomers = (callback, onError) => {
  return onSnapshot(customersCol, (snapshot) => {
    const customers = snapshot.docs.map((customerDoc) => ({
      id: customerDoc.id,
      ...customerDoc.data(),
    }));
    customers.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id'));
    callback(customers);
  }, onError);
};

// ==========================================
// Products CRUD
// ==========================================

export const addProduct = async (product) => {
  const docRef = doc(db, 'products', product.id);
  await setDoc(docRef, product);
  return product;
};

export const updateProduct = async (id, data) => {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, data);
};

export const deleteProductFromDB = async (id) => {
  const docRef = doc(db, 'products', id);
  await deleteDoc(docRef);
};

export const updateProductStock = async (id, newStock) => {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, { stock: newStock });
};

// ==========================================
// Transactions
// ==========================================

export const addTransaction = async (tx) => {
  const docRef = doc(db, 'transactions', tx.id);
  // Convert JS Date to Firestore Timestamp
  const txData = {
    ...tx,
    date: Timestamp.fromDate(tx.date instanceof Date ? tx.date : new Date(tx.date)),
  };
  await setDoc(docRef, txData);
  return tx;
};

export const updateTransactionAndStocks = async (id, transactionData, stockUpdates) => {
  await authReady;
  const batch = writeBatch(db);
  const transactionRef = doc(db, 'transactions', id);
  batch.update(transactionRef, {
    ...transactionData,
    date: Timestamp.fromDate(
      transactionData.date instanceof Date ? transactionData.date : new Date(transactionData.date),
    ),
  });
  stockUpdates.forEach(({ id: productId, newStock }) => {
    batch.update(doc(db, 'products', productId), { stock: newStock });
  });
  await batch.commit();
};

// ==========================================
// Mutations (Stock In/Out/Correction)
// ==========================================

export const addMutation = async (mutation) => {
  const docRef = doc(db, 'mutations', mutation.id);
  const mutData = {
    ...mutation,
    date: Timestamp.fromDate(mutation.date instanceof Date ? mutation.date : new Date(mutation.date)),
  };
  await setDoc(docRef, mutData);
  return mutation;
};

export const cancelMutationAndRestoreStock = async (mutationId, productId, newStock) => {
  await authReady;
  const batch = writeBatch(db);
  const mutationRef = doc(db, 'mutations', mutationId);
  batch.delete(mutationRef);
  if (productId && typeof newStock === 'number') {
    const productRef = doc(db, 'products', productId);
    batch.update(productRef, { stock: newStock });
  }
  await batch.commit();
};

// ==========================================
// Users
// ==========================================

export const addUser = async (user) => {
  const docRef = doc(db, 'users', user.id);
  await setDoc(docRef, user);
  return user;
};

export const updateUserInDB = async (id, data) => {
  const docRef = doc(db, 'users', id);
  await updateDoc(docRef, data);
};

export const deleteUserFromDB = async (id) => {
  const docRef = doc(db, 'users', id);
  await deleteDoc(docRef);
};

export const addCustomer = async (customer) => {
  await authReady;
  const customerRef = doc(db, 'customers', customer.id);
  await setDoc(customerRef, customer);
  return customer;
};

// ==========================================
// Seed Initial Data
// ==========================================

/**
 * Check if Firestore is already seeded, if not, upload all initial data.
 * Uses a "meta/appState" document to track seeding status.
 */
export const seedInitialData = async (initialProducts, initialTransactions, initialMutations, defaultUsers) => {
  try {
    await authReady;
    const metaDocRef = doc(db, 'meta', 'appState');
    const metaSnap = await getDoc(metaDocRef);

    if (metaSnap.exists() && metaSnap.data().isSeeded) {
      console.log('✅ Firestore sudah ter-seed sebelumnya. Skip seeding.');
      return false;
    }

    console.log('🌱 Memulai seeding data awal ke Firestore...');

    // Seed in batches (Firestore max 500 per batch)
    // Products (92 items)
    const batchSize = 450;
    for (let i = 0; i < initialProducts.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = initialProducts.slice(i, i + batchSize);
      chunk.forEach((product) => {
        const docRef = doc(db, 'products', product.id);
        batch.set(docRef, product);
      });
      await batch.commit();
    }
    console.log(`  ✅ ${initialProducts.length} produk ter-seed.`);

    // Transactions
    {
      const batch = writeBatch(db);
      initialTransactions.forEach((tx) => {
        const docRef = doc(db, 'transactions', tx.id);
        batch.set(docRef, {
          ...tx,
          date: Timestamp.fromDate(tx.date instanceof Date ? tx.date : new Date(tx.date)),
        });
      });
      await batch.commit();
      console.log(`  ✅ ${initialTransactions.length} transaksi ter-seed.`);
    }

    // Mutations
    {
      const batch = writeBatch(db);
      initialMutations.forEach((mut) => {
        const docRef = doc(db, 'mutations', mut.id);
        batch.set(docRef, {
          ...mut,
          date: Timestamp.fromDate(mut.date instanceof Date ? mut.date : new Date(mut.date)),
        });
      });
      await batch.commit();
      console.log(`  ✅ ${initialMutations.length} mutasi stok ter-seed.`);
    }

    // Users
    {
      const batch = writeBatch(db);
      defaultUsers.forEach((user) => {
        const docRef = doc(db, 'users', user.id);
        batch.set(docRef, user);
      });
      await batch.commit();
      console.log(`  ✅ ${defaultUsers.length} user ter-seed.`);
    }

    // Mark as seeded
    await setDoc(metaDocRef, { isSeeded: true, seededAt: Timestamp.now() });

    console.log('🎉 Seeding selesai!');
    return true;
  } catch (error) {
    console.error('❌ Error saat seeding:', error);
    throw error;
  }
};

// ==========================================
// Batch update product stocks (for checkout)
// ==========================================

export const batchUpdateProductStocks = async (stockUpdates) => {
  // stockUpdates = [{ id: 'P01', newStock: 14 }, ...]
  await authReady;
  const batch = writeBatch(db);
  stockUpdates.forEach(({ id, newStock }) => {
    const docRef = doc(db, 'products', id);
    batch.update(docRef, { stock: newStock });
  });
  await batch.commit();
};

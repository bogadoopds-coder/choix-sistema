import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // Buscar en qué organización está este usuario
          const miembroSnap = await getDoc(doc(db, "miembros", u.uid));
          if (miembroSnap.exists()) {
            setOrgId(miembroSnap.data().orgId || null);
            setRol(miembroSnap.data().rol || null);
          } else {
            setOrgId(null);
            setRol(null);
          }
        } catch (err) {
          console.error("Error buscando organización del usuario:", err);
          setOrgId(null);
          setRol(null);
        }
      } else {
        setOrgId(null);
        setRol(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, orgId, rol, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

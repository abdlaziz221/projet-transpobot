import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const { logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('auth_token');
          logout();
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: 'shield-check',
      label: 'Paramètres de sécurité',
      description: 'Gérer votre mot de passe',
      onPress: () => Alert.alert('À venir', 'Cette fonction sera bientôt disponible'),
    },
    {
      icon: 'bell',
      label: 'Notifications',
      description: 'Gérer vos alertes',
      onPress: () => Alert.alert('À venir', 'Cette fonction sera bientôt disponible'),
    },
    {
      icon: 'information',
      label: 'À propos',
      description: 'Version et informations',
      onPress: () => Alert.alert('TranspoBot Mobile', 'Version 1.0.0\n© 2026 TranspoBot Sénégal 🇸🇳'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account-circle" size={80} color="#c4581e" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Administrateur</Text>
            <Text style={styles.profileRole}>Gestionnaire de Flotte</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>En ligne</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Jours actifs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>847</Text>
            <Text style={styles.statLabel}>Actions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Équipes</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Paramètres</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={24}
                color="#c4581e"
                style={styles.menuIcon}
              />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionLabel}>Version</Text>
          <Text style={styles.versionNumber}>1.0.0</Text>
          <Text style={styles.versionDesc}>Dernière mise à jour: 14 avril 2026</Text>
        </View>
      </ScrollView>

      {/* Logout Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color="white" />
          <Text style={styles.logoutBtnText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#07090f',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  profileCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#c4581e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: '#999',
  },
  versionSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  versionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  versionNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  versionDesc: {
    fontSize: 11,
    color: '#ccc',
  },
  footer: {
    padding: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
});

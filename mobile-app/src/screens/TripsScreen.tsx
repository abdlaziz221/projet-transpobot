import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store';

interface Trip {
  id: number;
  ligne_code: string;
  origine: string;
  destination: string;
  date_heure_depart: string;
  statut: string;
  nb_passagers: number;
  recette: number;
  chauffeur_nom: string;
  vehicule_immat: string;
}

export default function TripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ouverts');
  const [refreshing, setRefreshing] = useState(false);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    fetchTrips();
  }, [activeFilter]);

  const fetchTrips = async () => {
    setIsLoading(true);
    try {
      let url = `${process.env.EXPO_PUBLIC_API_URL}/trajets_custom?limit=50`;

      if (activeFilter === 'ouverts') {
        url += '&statut=en_cours&statut=planifie';
      } else if (activeFilter !== 'all') {
        url += `&statut=${activeFilter}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTrips(data.data || []);
    } catch (error) {
      console.error('Erreur fetch trajets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'termine':
        return '#10b981';
      case 'en_cours':
        return '#3b82f6';
      case 'planifie':
        return '#f59e0b';
      case 'annule':
        return '#ef4444';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'termine':
        return 'Terminé';
      case 'en_cours':
        return 'En cours';
      case 'planifie':
        return 'Planifié';
      case 'annule':
        return 'Annulé';
      default:
        return statut;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderTripCard = ({ item }: { item: Trip }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeCode}>{item.ligne_code}</Text>
          <View style={styles.routePath}>
            <Text style={styles.city} numberOfLines={1}>
              {item.origine}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color="#999" style={{ marginHorizontal: 4 }} />
            <Text style={styles.city} numberOfLines={1}>
              {item.destination}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.statut) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.statut) }]}>
            {getStatusLabel(item.statut)}
          </Text>
        </View>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="clock" size={14} color="#666" />
          <Text style={styles.detailText}>{formatTime(item.date_heure_depart)}</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="account" size={14} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.chauffeur_nom}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="bus" size={14} color="#666" />
          <Text style={styles.detailText}>{item.vehicule_immat}</Text>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.passengerInfo}>
          <MaterialCommunityIcons name="account-multiple" size={16} color="#3b82f6" />
          <Text style={styles.passengerText}>{item.nb_passagers} passagers</Text>
        </View>
        <Text style={styles.recetteText}>{item.recette.toLocaleString('fr-FR')} FCFA</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trajets</Text>
        <Text style={styles.headerSubtitle}>{trips.length} trajets</Text>
      </View>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {[
          { key: 'ouverts', label: 'Ouverts' },
          { key: 'en_cours', label: 'En cours' },
          { key: 'termine', label: 'Terminés' },
          { key: 'all', label: 'Tous' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterBtn,
              activeFilter === filter.key && styles.filterBtnActive,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text style={[styles.filterBtnText, activeFilter === filter.key && styles.filterBtnTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Trips List */}
      {isLoading && trips.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#c4581e" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTripCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>Aucun trajet</Text>
              <Text style={styles.emptyDesc}>Aucun trajet ne correspond à ce filtre</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  filterContainer: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  filterContent: {
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterBtnActive: {
    backgroundColor: '#c4581e',
    borderColor: '#c4581e',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterBtnTextActive: {
    color: 'white',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  routeInfo: {
    flex: 1,
    marginRight: 12,
  },
  routeCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#c4581e',
    marginBottom: 4,
  },
  routePath: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  city: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tripDetails: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passengerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  recetteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
});

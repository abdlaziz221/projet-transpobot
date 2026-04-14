import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIncidentsStore, useAuthStore } from '../store';

export default function IncidentsScreen() {
  const { incidents, isLoading, fetchIncidents, resolveIncident } = useIncidentsStore();
  const [filteredIncidents, setFilteredIncidents] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 20000); // Refresh every 20s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredIncidents(incidents);
    } else if (activeFilter === 'open') {
      setFilteredIncidents(incidents.filter((i) => !i.resolu));
    } else if (activeFilter === 'critical') {
      setFilteredIncidents(incidents.filter((i) => !i.resolu && i.gravite === 'grave'));
    }
  }, [incidents, activeFilter]);

  const handleResolve = (id: number) => {
    Alert.alert('Confirmer', 'Marquer cet incident comme résolu ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Résoudre',
        style: 'default',
        onPress: () => resolveIncident(id),
      },
    ]);
  };

  const getSeverityColor = (gravite: string) => {
    switch (gravite) {
      case 'grave':
        return '#ef4444';
      case 'moyen':
        return '#f59e0b';
      default:
        return '#3b82f6';
    }
  };

  const getSeverityLabel = (gravite: string) => {
    switch (gravite) {
      case 'grave':
        return 'Critique';
      case 'moyen':
        return 'Moyen';
      default:
        return 'Mineur';
    }
  };

  const unresolved = incidents.filter((i) => !i.resolu).length;
  const critical = incidents.filter((i) => !i.resolu && i.gravite === 'grave').length;

  const renderIncidentItem = ({ item }: { item: any }) => (
    <View style={styles.incidentCard}>
      <View style={[styles.gravityBadge, { backgroundColor: getSeverityColor(item.gravite) + '20', borderLeftColor: getSeverityColor(item.gravite) }]}>
        <Text style={[styles.gravityText, { color: getSeverityColor(item.gravite) }]}>
          {getSeverityLabel(item.gravite)}
        </Text>
      </View>

      <View style={styles.incidentContent}>
        <Text style={styles.incidentType}>{item.type}</Text>
        <Text style={styles.incidentDesc} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.incidentMeta}>
          <MaterialCommunityIcons name="account" size={14} color="#999" />
          <Text style={styles.metaText}>{item.chauffeur_nom} {item.chauffeur_prenom}</Text>
          <MaterialCommunityIcons name="calendar" size={14} color="#999" style={{ marginLeft: 12 }} />
          <Text style={styles.metaText}>{new Date(item.date_incident).toLocaleDateString('fr-FR')}</Text>
        </View>
      </View>

      {!item.resolu && (
        <TouchableOpacity
          style={styles.resolveBtn}
          onPress={() => handleResolve(item.id)}
        >
          <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
        </TouchableOpacity>
      )}
      {item.resolu && (
        <View style={styles.resolvedBadge}>
          <MaterialCommunityIcons name="check" size={14} color="#10b981" />
          <Text style={styles.resolvedText}>Traité</Text>
        </View>
      )}
    </View>
  );

  if (isLoading && incidents.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#c4581e" />
        <Text style={styles.loadingText}>Chargement des incidents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incidents</Text>
        <Text style={styles.headerSubtitle}>{unresolved} en attente</Text>
      </View>

      {/* Alert Banner */}
      {critical > 0 && (
        <View style={styles.alertBanner}>
          <MaterialCommunityIcons name="alert-circle" size={24} color="#ef4444" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.alertTitle}>{critical} Incident(s) Critique(s)</Text>
            <Text style={styles.alertDesc}>Attention immédiate requise</Text>
          </View>
        </View>
      )}

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {[
          { key: 'all', label: 'Tous' },
          { key: 'open', label: 'Ouverts' },
          { key: 'critical', label: 'Critiques' },
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

      {/* Incidents List */}
      {filteredIncidents.length > 0 ? (
        <FlatList
          data={filteredIncidents}
          renderItem={renderIncidentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="check-circle" size={48} color="#10b981" />
          <Text style={styles.emptyTitle}>Aucun incident</Text>
          <Text style={styles.emptyDesc}>Tous les incidents ont été résolus</Text>
        </View>
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
    color: '#ef4444',
    marginTop: 4,
    fontWeight: '600',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  alertDesc: {
    fontSize: 11,
    color: '#991b1b',
    marginTop: 2,
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
  incidentCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  gravityBadge: {
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  gravityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  incidentContent: {
    flex: 1,
  },
  incidentType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  incidentDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  incidentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#999',
  },
  resolveBtn: {
    padding: 8,
    marginLeft: 8,
  },
  resolvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#10b981',
    gap: 4,
  },
  resolvedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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

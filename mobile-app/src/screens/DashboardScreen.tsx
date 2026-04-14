import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDashboardStore } from '../store';

export default function DashboardScreen() {
  const { stats, isLoading, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !stats) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#c4581e" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const kpiData = [
    {
      title: 'Véhicules Actifs',
      value: stats?.vehicules_actifs || 0,
      icon: 'bus',
      color: '#2563eb',
    },
    {
      title: 'Chauffeurs Libres',
      value: stats?.chauffeurs_disponibles || 0,
      icon: 'account',
      color: '#10b981',
    },
    {
      title: 'Trajets Aujourd\'hui',
      value: stats?.trajets_aujourd_hui || 0,
      icon: 'map-marker-radius',
      color: '#f59e0b',
    },
    {
      title: 'Incidents Ouverts',
      value: stats?.incidents_ouverts || 0,
      icon: 'alert-circle',
      color: '#ef4444',
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TranspoBot</Text>
        <Text style={styles.headerSubtitle}>Dashboard Mobile</Text>
      </View>

      {/* Revenue Card */}
      <View style={styles.revenueCard}>
        <View style={styles.revenueContent}>
          <Text style={styles.revenueLabel}>Recette Journalière</Text>
          <Text style={styles.revenueValue}>
            {(stats?.recette_jour || 0).toLocaleString('fr-FR')} FCFA
          </Text>
          <View style={styles.revenueRow}>
            <View>
              <Text style={styles.revenueSmallLabel}>Semaine</Text>
              <Text style={styles.revenueSmallValue}>
                {((stats?.recette_semaine || 0) / 1000).toFixed(0)}k FCFA
              </Text>
            </View>
            <View>
              <Text style={styles.revenueSmallLabel}>Ponctualité</Text>
              <Text style={styles.revenueSmallValue}>{stats?.on_time_rate || 0}%</Text>
            </View>
          </View>
        </View>
        <MaterialCommunityIcons name="trending-up" size={48} color="rgba(255,255,255,0.3)" style={styles.revenueIcon} />
      </View>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        {kpiData.map((kpi) => (
          <TouchableOpacity key={kpi.title} style={[styles.kpiCard, { borderLeftColor: kpi.color }]}>
            <View style={[styles.iconBg, { backgroundColor: `${kpi.color}20` }]}>
              <MaterialCommunityIcons name={kpi.icon as any} size={28} color={kpi.color} />
            </View>
            <View style={styles.kpiInfo}>
              <Text style={styles.kpiTitle}>{kpi.title}</Text>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Maintenance Alert */}
      {stats?.maintenances_en_attente > 0 && (
        <View style={styles.alertCard}>
          <View style={styles.alertIcon}>
            <MaterialCommunityIcons name="alert-circle" size={32} color="#ef4444" />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Attention Maintenance</Text>
            <Text style={styles.alertMessage}>
              {stats.maintenances_en_attente} véhicule(s) en attente de maintenance
            </Text>
          </View>
        </View>
      )}

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Passagers (Mois)</Text>
          <Text style={styles.statValue}>{stats?.total_passagers_mois || 0}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Incidents Graves</Text>
          <Text style={styles.statValue}>{stats?.incidents_graves || 0}</Text>
        </View>
      </View>
    </ScrollView>
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
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#07090f',
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  revenueCard: {
    margin: 16,
    backgroundColor: 'linear-gradient(135deg, #c4581e 0%, #e07b3a 100%)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  revenueContent: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginTop: 8,
  },
  revenueRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 20,
  },
  revenueSmallLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  revenueSmallValue: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    marginTop: 2,
  },
  revenueIcon: {
    marginLeft: 16,
  },
  kpiGrid: {
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kpiInfo: {
    flex: 1,
  },
  kpiTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  alertCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  alertMessage: {
    fontSize: 12,
    color: '#991b1b',
    marginTop: 2,
  },
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  divider: {
    width: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
});

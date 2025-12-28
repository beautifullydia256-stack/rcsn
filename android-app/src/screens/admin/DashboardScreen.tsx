import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, FAB, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchStudents } from '../../store/slices/studentSlice';
import { SyncService } from '../../services/SyncService';
import { theme } from '../../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AdminDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { students, isLoading } = useSelector((state: RootState) => state.students);
  const { isSyncing, pendingOperations } = useSelector((state: RootState) => state.sync);
  const [refreshing, setRefreshing] = React.useState(false);
  const [schoolIdError, setSchoolIdError] = React.useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!user.school_id) {
      setSchoolIdError('Your account is not linked to a school. Please contact support to complete your account setup.');
      return;
    }

    setSchoolIdError(null);
    dispatch(fetchStudents(user.school_id));
  }, [user?.school_id, user, dispatch]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    if (user?.school_id) {
      await dispatch(fetchStudents(user.school_id));
    }
    await SyncService.performSync();
    setRefreshing(false);
  }, [user?.school_id, dispatch]);

  const stats = [
    {
      label: 'Total Students',
      value: students.length,
      icon: 'account-group',
      color: theme.colors.primary,
    },
    {
      label: 'Active Students',
      value: students.filter(s => s.status === 'active').length,
      icon: 'account-check',
      color: '#10b981',
    },
    {
      label: 'Pending Sync',
      value: pendingOperations,
      icon: 'sync',
      color: '#f59e0b',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Admin Dashboard
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Welcome back, {user?.name}
          </Text>
        </View>

        {schoolIdError && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <View style={styles.errorContent}>
                <Icon name="alert-circle" size={24} color={theme.colors.error} />
                <View style={styles.errorText}>
                  <Text variant="titleMedium" style={styles.errorTitle}>
                    Account Setup Required
                  </Text>
                  <Text variant="bodyMedium" style={styles.errorMessage}>
                    {schoolIdError}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {isSyncing && (
          <Card style={styles.syncCard}>
            <Card.Content>
              <View style={styles.syncContent}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.syncText}>Syncing data...</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <Card key={index} style={styles.statCard}>
              <Card.Content>
                <View style={styles.statContent}>
                  <Icon name={stat.icon} size={32} color={stat.color} />
                  <View style={styles.statText}>
                    <Text variant="headlineSmall" style={[styles.statValue, { color: stat.color }]}>
                      {stat.value}
                    </Text>
                    <Text variant="bodySmall" style={styles.statLabel}>
                      {stat.label}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>

        <Card style={styles.quickActionsCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Quick Actions
            </Text>
            <View style={styles.actionsGrid}>
              <Button
                mode="contained"
                icon="account-plus"
                onPress={() => navigation.navigate('AddStudent')}
                style={styles.actionButton}
              >
                Add Student
              </Button>
              <Button
                mode="contained"
                icon="school"
                onPress={() => navigation.navigate('AddTeacher')}
                style={styles.actionButton}
              >
                Add Teacher
              </Button>
              <Button
                mode="contained"
                icon="file-document-multiple"
                onPress={() => navigation.navigate('ExamSets')}
                style={styles.actionButton}
              >
                Exam Sets
              </Button>
              <Button
                mode="contained"
                icon="file-chart"
                onPress={() => navigation.navigate('Reports')}
                style={styles.actionButton}
              >
                Generate Reports
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.recentCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Recent Students
            </Text>
            {isLoading ? (
              <ActivityIndicator />
            ) : students.length === 0 ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                No students yet. Add your first student!
              </Text>
            ) : (
              students.slice(0, 5).map((student) => (
                <View key={student.student_id} style={styles.studentItem}>
                  <Text variant="bodyLarge">{student.name}</Text>
                  <Text variant="bodySmall" style={styles.classText}>
                    {student.current_class}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddStudent')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.primary,
  },
  title: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  subtitle: {
    color: theme.colors.onPrimary,
    opacity: 0.8,
    marginTop: 4,
  },
  syncCard: {
    margin: 16,
    marginTop: 16,
  },
  syncContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncText: {
    marginLeft: 12,
  },
  errorCard: {
    margin: 16,
    marginTop: 16,
    backgroundColor: theme.colors.errorContainer,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {
    marginLeft: 12,
    flex: 1,
  },
  errorTitle: {
    color: theme.colors.error,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorMessage: {
    color: theme.colors.onErrorContainer,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 12,
    flex: 1,
  },
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    color: theme.colors.onSurface,
    opacity: 0.6,
  },
  quickActionsCard: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  recentCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 80,
  },
  studentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  classText: {
    color: theme.colors.onSurface,
    opacity: 0.6,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: theme.colors.onSurface,
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});

export default AdminDashboardScreen;



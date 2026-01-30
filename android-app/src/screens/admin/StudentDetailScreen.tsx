import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, Chip } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { theme } from '../../theme';

const StudentDetailScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedStudent } = useSelector((state: RootState) => state.students);

  if (!selectedStudent) {
    return (
      <View style={styles.container}>
        <Text>No student selected</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.name}>
              {selectedStudent.name}
            </Text>
            <Chip
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    selectedStudent.status === 'active' ? '#10b981' : '#6b7280',
                },
              ]}
            >
              {selectedStudent.status}
            </Chip>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Student Information
            </Text>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Class:
              </Text>
              <Text variant="bodyLarge">{selectedStudent.current_class}</Text>
            </View>

            {selectedStudent.admission_number && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Admission Number:
                </Text>
                <Text variant="bodyLarge">{selectedStudent.admission_number}</Text>
              </View>
            )}

            {selectedStudent.expected_fee_amount && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Expected Fee:
                </Text>
                <Text variant="bodyLarge">
                  {selectedStudent.expected_fee_amount.toLocaleString()} UGX
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Status:
              </Text>
              <Text variant="bodyLarge" style={styles.statusText}>
                {selectedStudent.status.charAt(0).toUpperCase() +
                  selectedStudent.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              mode="contained"
              icon="pencil"
              onPress={() => {
                // Navigate to edit screen
                navigation.navigate('EditStudent', { student: selectedStudent });
              }}
              style={styles.actionButton}
            >
              Edit Student
            </Button>
            <Button
              mode="outlined"
              icon="file-chart"
              onPress={() => {
                // Navigate to reports
                navigation.navigate('Reports', { studentId: selectedStudent.student_id });
              }}
              style={styles.actionButton}
            >
              View Reports
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    flex: 1,
    fontWeight: 'bold',
  },
  statusChip: {
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  label: {
    color: theme.colors.onSurface,
    opacity: 0.6,
  },
  statusText: {
    textTransform: 'capitalize',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});

export default StudentDetailScreen;



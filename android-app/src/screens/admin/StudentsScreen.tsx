import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Text, Searchbar, FAB, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchStudents, setSelectedStudent, Student } from '../../store/slices/studentSlice';
import { theme } from '../../theme';

const StudentsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { students, isLoading } = useSelector((state: RootState) => state.students);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.school_id) {
      dispatch(fetchStudents(user.school_id));
    }
  }, [user?.school_id, dispatch]);

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.current_class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admission_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      onPress={() => {
        dispatch(setSelectedStudent(item));
        navigation.navigate('StudentDetail');
      }}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.studentRow}>
            <View style={styles.studentInfo}>
              <Text variant="titleMedium">{item.name}</Text>
              <Text variant="bodySmall" style={styles.classText}>
                {item.current_class}
              </Text>
              {item.admission_number && (
                <Text variant="bodySmall" style={styles.admissionText}>
                  Adm: {item.admission_number}
                </Text>
              )}
            </View>
            <View style={styles.statusBadge}>
              <Text
                variant="bodySmall"
                style={[
                  styles.statusText,
                  { color: item.status === 'active' ? '#10b981' : '#6b7280' },
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search students..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : filteredStudents.length === 0 ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            {searchQuery ? 'No students found' : 'No students yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          renderItem={renderStudent}
          keyExtractor={(item) => item.student_id}
          contentContainerStyle={styles.list}
        />
      )}

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
  searchbar: {
    margin: 16,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentInfo: {
    flex: 1,
  },
  classText: {
    color: theme.colors.onSurface,
    opacity: 0.6,
    marginTop: 4,
  },
  admissionText: {
    color: theme.colors.onSurface,
    opacity: 0.5,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
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

export default StudentsScreen;



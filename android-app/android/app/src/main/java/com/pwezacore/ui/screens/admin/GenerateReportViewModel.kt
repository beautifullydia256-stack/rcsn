package com.pwezacore.ui.screens.admin

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pwezacore.data.local.entities.StudentEntity
import com.pwezacore.data.remote.dto.SchoolTermDto
import com.pwezacore.data.repository.ReportRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class GenerateReportUiState(
    val terms: List<SchoolTermDto> = emptyList(),
    val classes: List<String> = emptyList(),
    val students: List<StudentEntity> = emptyList(),
    val selectedTerm: SchoolTermDto? = null,
    val selectedClass: String? = null,
    val reportType: ReportType = ReportType.SingleStudent,
    val selectedStudent: StudentEntity? = null,
    val loading: Boolean = false,
    val loadingStudents: Boolean = false,
    val error: String? = null,
    val reportText: String? = null
)

enum class ReportType { SingleStudent, WholeClass }

@HiltViewModel
class GenerateReportViewModel @Inject constructor(
    private val reportRepository: ReportRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(GenerateReportUiState())
    val uiState: StateFlow<GenerateReportUiState> = _uiState.asStateFlow()

    init {
        loadTermsAndClasses()
    }

    fun loadTermsAndClasses() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loading = true, error = null)
            val schoolId = reportRepository.getCurrentSchoolId()
            if (schoolId == null) {
                _uiState.value = _uiState.value.copy(
                    loading = false,
                    error = "School not set. Please sign in again."
                )
                return@launch
            }
            kotlin.runCatching {
                reportRepository.loadTermsAndClasses(schoolId)
            }.fold(
                onSuccess = { (terms, classes) ->
                    _uiState.value = _uiState.value.copy(
                        terms = terms,
                        classes = classes,
                        loading = false,
                        error = null,
                        selectedTerm = terms.firstOrNull(),
                        selectedClass = classes.firstOrNull()
                    )
                    _uiState.value.selectedClass?.let { loadStudents(it) }
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        loading = false,
                        error = it.message ?: "Failed to load data"
                    )
                }
            )
        }
    }

    fun selectTerm(term: SchoolTermDto) {
        _uiState.value = _uiState.value.copy(selectedTerm = term, reportText = null)
    }

    fun selectClass(className: String) {
        _uiState.value = _uiState.value.copy(
            selectedClass = className,
            selectedStudent = null,
            reportText = null
        )
        loadStudents(className)
    }

    fun setReportType(type: ReportType) {
        _uiState.value = _uiState.value.copy(
            reportType = type,
            selectedStudent = if (type == ReportType.WholeClass) null else _uiState.value.selectedStudent,
            reportText = null
        )
    }

    fun selectStudent(student: StudentEntity?) {
        _uiState.value = _uiState.value.copy(selectedStudent = student, reportText = null)
    }

    private fun loadStudents(className: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(loadingStudents = true)
            val schoolId = reportRepository.getCurrentSchoolId()
            if (schoolId == null) {
                _uiState.value = _uiState.value.copy(loadingStudents = false)
                return@launch
            }
            kotlin.runCatching {
                reportRepository.loadStudents(schoolId, className)
            }.fold(
                onSuccess = { list ->
                    _uiState.value = _uiState.value.copy(
                        students = list,
                        loadingStudents = false,
                        selectedStudent = if (_uiState.value.reportType == ReportType.SingleStudent) list.firstOrNull() else null
                    )
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        students = emptyList(),
                        loadingStudents = false,
                        error = it.message
                    )
                }
            )
        }
    }

    fun generateReport() {
        val state = _uiState.value
        val term = state.selectedTerm ?: return
        val className = state.selectedClass ?: return
        val students = state.students
        if (students.isEmpty()) {
            _uiState.value = state.copy(error = "No students in this class")
            return
        }
        val single = if (state.reportType == ReportType.SingleStudent) state.selectedStudent else null
        if (state.reportType == ReportType.SingleStudent && single == null) {
            _uiState.value = state.copy(error = "Select a student")
            return
        }
        val text = reportRepository.buildReportSummary(
            termLabel = term.displayName(),
            className = className,
            students = students,
            singleStudent = single
        )
        _uiState.value = state.copy(reportText = text, error = null)
    }

    fun clearReport() {
        _uiState.value = _uiState.value.copy(reportText = null)
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}

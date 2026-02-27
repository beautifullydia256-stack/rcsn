package com.pwezacore.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.theme.LiquidGlassTheme
import com.pwezacore.ui.navigation.AccountantRoutes
import com.pwezacore.ui.screens.accountant.AccountantAdjustmentsScreen
import com.pwezacore.ui.screens.accountant.AccountantBalancesScreen
import com.pwezacore.ui.screens.accountant.AccountantBillingScreen
import com.pwezacore.ui.screens.accountant.AccountantDashboardScreen
import com.pwezacore.ui.screens.accountant.AccountantExpensesScreen
import com.pwezacore.ui.screens.accountant.AccountantFeeStructureScreen
import com.pwezacore.ui.screens.accountant.AccountantBankScreen
import com.pwezacore.ui.screens.accountant.AccountantOutstandingScreen
import com.pwezacore.ui.screens.accountant.AccountantPaymentsScreen
import com.pwezacore.ui.screens.accountant.AccountantReceiptsScreen
import com.pwezacore.ui.screens.accountant.AccountantReportsScreen
import com.pwezacore.ui.screens.accountant.AccountantSettingsScreen
import com.pwezacore.ui.components.accountant.RecordPaymentDialog

private val WebSidebarBg = Color(0x14FFFFFF)
private val WebSidebarBorder = Color(0x33FFFFFF)
private val WebSidebarText = Color(0xD9FFFFFF)
private val WebSidebarActiveBg = Color(0x264DABFF)
private val WebSidebarActiveText = Color(0xFF4DABFF)
private val WebSidebarLogout = Color(0xE6EF4444)
private val WebNavbarBg = Color(0xFF1E293B)
private val WebNavbarBorder = Color(0xFF334155)
private val WebNavbarText = Color(0xFF94A3B8)
private val WebNavbarTextBold = Color(0xFFF8FAFC)
private val WebNavbarSearchBg = Color(0xFF0F172A)
private val WebNavbarSearchBorder = Color(0xFF475569)
private val WebContentBg = Color(0xFF0F172A)

data class AccountantNavItem(val route: String, val label: String, val icon: ImageVector)

// SPA order: Dashboard, Fee Structure, Invoices & Billing, Payments, Receipts, Outstanding Fees, Expenses, Bank & Cash, Reports, Adjustments, Logout
private val accountantSidebarItems = listOf(
    AccountantNavItem(AccountantRoutes.DASHBOARD, "Dashboard", Icons.Default.Dashboard),
    AccountantNavItem(AccountantRoutes.FEE_STRUCTURE, "Fee Structure", Icons.Default.CreditCard),
    AccountantNavItem(AccountantRoutes.BILLING, "Invoices & Billing", Icons.Default.Description),
    AccountantNavItem(AccountantRoutes.PAYMENTS, "Payments", Icons.Default.AccountBalance),
    AccountantNavItem(AccountantRoutes.RECEIPTS, "Receipts", Icons.Default.Receipt),
    AccountantNavItem(AccountantRoutes.OUTSTANDING, "Outstanding Fees", Icons.Default.Wallet),
    AccountantNavItem(AccountantRoutes.EXPENSES, "Expenses", Icons.Default.TrendingUp),
    AccountantNavItem(AccountantRoutes.BANK, "Bank & Cash", Icons.Default.CreditCard),
    AccountantNavItem(AccountantRoutes.REPORTS, "Reports", Icons.Default.Description),
    AccountantNavItem(AccountantRoutes.ADJUSTMENTS, "Adjustments", Icons.Default.Sync),
)

@Composable
fun WebStyleAccountantLayout(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    userDisplayName: String = "Accountant",
    userEmail: String = "accountant@school.com",
    modifier: Modifier = Modifier
) {
    var recordPaymentOpen by remember { mutableStateOf(false) }
    Row(modifier = modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .width(288.dp)
                .fillMaxHeight()
                .background(WebSidebarBg)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp).height(56.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                androidx.compose.ui.graphics.Brush.linearGradient(
                                    listOf(Color(0xFF059669), Color(0xFF0D9488))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Wallet, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.White)
                    }
                    Text("PwezaCore", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
                Box(Modifier.fillMaxWidth().height(1.dp).padding(horizontal = 16.dp).background(WebSidebarBorder))
                Spacer(Modifier.height(8.dp))
                Text("MENU", color = WebSidebarText.copy(alpha = 0.7f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                accountantSidebarItems.forEach { item ->
                    AccountantSidebarNavRow(item = item, currentRoute = currentRoute, onNavigate = onNavigate)
                }
                Spacer(Modifier.height(8.dp))
                Box(Modifier.fillMaxWidth().height(1.dp).padding(horizontal = 16.dp).background(WebSidebarBorder))
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(onClick = onLogout)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.ExitToApp, contentDescription = null, tint = WebSidebarLogout)
                    Text("Logout", color = WebSidebarLogout, fontSize = 14.sp)
                }
            }
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxSize()
                .background(WebContentBg)
        ) {
            var searchQuery by remember { mutableStateOf("") }
            var profileOpen by remember { mutableStateOf(false) }
            val searchFocusRequester = remember { FocusRequester() }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(72.dp)
                    .background(WebNavbarBg)
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .widthIn(min = 220.dp, max = 400.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(WebNavbarSearchBg)
                            .border(1.dp, WebNavbarSearchBorder, RoundedCornerShape(12.dp))
                            .clickable { searchFocusRequester.requestFocus() },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .padding(start = 14.dp, end = 8.dp, top = 2.dp, bottom = 2.dp)
                        ) {
                            if (searchQuery.isEmpty()) {
                                Text(
                                    text = "Search students, receipts, invoices…",
                                    color = WebNavbarText,
                                    fontSize = 14.sp,
                                    modifier = Modifier.align(Alignment.CenterStart)
                                )
                            }
                            BasicTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 10.dp)
                                    .focusRequester(searchFocusRequester),
                                singleLine = true,
                                textStyle = TextStyle(color = WebNavbarTextBold, fontSize = 14.sp)
                            )
                        }
                        Icon(Icons.Default.Search, contentDescription = null, tint = WebNavbarText, modifier = Modifier.padding(end = 14.dp).size(20.dp))
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TextButton(
                        onClick = { },
                        colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = WebNavbarText)
                    ) {
                        Icon(Icons.Default.Notifications, contentDescription = null, modifier = Modifier.size(20.dp))
                    }
                    Box {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(WebNavbarSearchBg)
                                .clickable { profileOpen = !profileOpen }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(9999.dp))
                                    .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF10B981), Color(0xFF0D9488)))),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = userDisplayName.take(1).uppercase().ifEmpty { "?" },
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(userDisplayName, color = WebNavbarTextBold, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Text("Accountant", color = WebNavbarText, fontSize = 12.sp)
                            }
                        }
                        if (profileOpen) {
                            Column(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(top = 48.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(WebNavbarBg)
                                    .padding(8.dp)
                            ) {
                                Text(userDisplayName, color = WebNavbarTextBold, fontSize = 14.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                                Text(userEmail, color = WebNavbarText, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 12.dp).padding(bottom = 8.dp))
                                Box(Modifier.fillMaxWidth().height(1.dp).background(WebNavbarBorder))
                                TextButton(onClick = { profileOpen = false; onNavigate(AccountantRoutes.SETTINGS) }) {
                                    Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(18.dp), tint = WebNavbarText)
                                    Spacer(Modifier.size(8.dp))
                                    Text("Settings", color = WebNavbarTextBold)
                                }
                                TextButton(onClick = { profileOpen = false; onLogout() }) {
                                    Text("Logout", color = Color(0xFFDC2626))
                                }
                            }
                        }
                    }
                }
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(WebNavbarBorder))
            LiquidGlassTheme(darkTheme = true) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth()
                        .background(WebContentBg)
                        .padding(24.dp)
                ) {
                    when (currentRoute) {
                        AccountantRoutes.DASHBOARD -> AccountantDashboardScreen(
                            onRecordPayment = { recordPaymentOpen = true },
                            onGenerateInvoice = { onNavigate(AccountantRoutes.BILLING) },
                            onRecordExpense = { onNavigate(AccountantRoutes.EXPENSES) },
                            onSendReminder = { }, // Web: no action; desktop matches
                            onPayments = { onNavigate(AccountantRoutes.PAYMENTS) },
                            onExpenses = { onNavigate(AccountantRoutes.EXPENSES) },
                            onBalances = { onNavigate(AccountantRoutes.OUTSTANDING) },
                            onReports = { onNavigate(AccountantRoutes.REPORTS) }
                        )
                        AccountantRoutes.FEE_STRUCTURE -> AccountantFeeStructureScreen()
                        AccountantRoutes.BILLING -> AccountantBillingScreen()
                        AccountantRoutes.PAYMENTS -> AccountantPaymentsScreen(
                            onBackToDashboard = { onNavigate(AccountantRoutes.DASHBOARD) },
                            onRecordPayment = { },
                            onViewOutstanding = { onNavigate(AccountantRoutes.OUTSTANDING) },
                            onViewReceipts = { onNavigate(AccountantRoutes.RECEIPTS) }
                        )
                        AccountantRoutes.RECEIPTS -> AccountantReceiptsScreen()
                        AccountantRoutes.OUTSTANDING -> AccountantBalancesScreen(
                            onBackToDashboard = { onNavigate(AccountantRoutes.DASHBOARD) },
                            onRecordPayment = { onNavigate(AccountantRoutes.PAYMENTS) }
                        )
                        AccountantRoutes.EXPENSES -> AccountantExpensesScreen(onRecordExpense = {})
                        AccountantRoutes.BANK -> AccountantBankScreen()
                        AccountantRoutes.REPORTS -> AccountantReportsScreen()
                        AccountantRoutes.ADJUSTMENTS -> AccountantAdjustmentsScreen()
                        AccountantRoutes.SETTINGS -> AccountantSettingsScreen()
                        else -> AccountantDashboardScreen(
                            onRecordPayment = { recordPaymentOpen = true },
                            onGenerateInvoice = { onNavigate(AccountantRoutes.BILLING) },
                            onRecordExpense = { onNavigate(AccountantRoutes.EXPENSES) },
                            onSendReminder = { }, // Web: no action
                            onPayments = { onNavigate(AccountantRoutes.PAYMENTS) },
                            onExpenses = { onNavigate(AccountantRoutes.EXPENSES) },
                            onBalances = { onNavigate(AccountantRoutes.OUTSTANDING) },
                            onReports = { onNavigate(AccountantRoutes.REPORTS) }
                        )
                    }
                }
            }
            RecordPaymentDialog(
                open = recordPaymentOpen,
                onClose = { recordPaymentOpen = false }
            )
        }
    }
}

@Composable
private fun AccountantSidebarNavRow(
    item: AccountantNavItem,
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    val active = when {
        item.route.isEmpty() -> currentRoute.isEmpty()
        else -> currentRoute == item.route || currentRoute.startsWith(item.route + "/")
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .then(
                if (active) Modifier.border(1.dp, Color(0x4D4DABFF), RoundedCornerShape(12.dp))
                else Modifier
            )
            .background(if (active) WebSidebarActiveBg else Color.Transparent)
            .clickable { onNavigate(item.route) }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(item.icon, contentDescription = item.label, tint = if (active) WebSidebarActiveText else WebSidebarText)
        Text(item.label, color = if (active) WebSidebarActiveText else WebSidebarText, fontSize = 14.sp)
    }
}

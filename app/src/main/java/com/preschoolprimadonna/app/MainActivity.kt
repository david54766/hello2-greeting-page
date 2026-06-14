package com.preschoolprimadonna.app

import android.app.Activity
import android.content.Intent
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.net.toUri
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.preschoolprimadonna.app.data.Center
import com.preschoolprimadonna.app.data.CoachingSession
import com.preschoolprimadonna.app.data.EliteReply
import com.preschoolprimadonna.app.data.EliteThread
import com.preschoolprimadonna.app.data.RavenBooking
import com.preschoolprimadonna.app.data.RavenSlot
import com.preschoolprimadonna.app.data.RavenVideo
import com.preschoolprimadonna.app.data.Subscription
import com.preschoolprimadonna.app.data.TemplateItem
import com.preschoolprimadonna.app.ui.PrimaDonnaTheme
import com.preschoolprimadonna.app.ui.PrimaGold
import com.preschoolprimadonna.app.ui.PrimaPink
import com.preschoolprimadonna.app.ui.PrimaSoft
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.text.NumberFormat
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.roundToInt

class MainActivity : ComponentActivity() {
    private var pendingAuthRedirect by mutableStateOf<Uri?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingAuthRedirect = intent?.data
        setContent {
            PrimaDonnaTheme {
                val viewModel: PrimaDonnaViewModel = viewModel()
                val state by viewModel.state.collectAsStateWithLifecycle()
                val authRedirect = pendingAuthRedirect
                LaunchedEffect(authRedirect) {
                    authRedirect?.let {
                        viewModel.handleAuthRedirect(it)
                        pendingAuthRedirect = null
                    }
                }
                PrimaDonnaApp(state = state, viewModel = viewModel)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        pendingAuthRedirect = intent.data
    }
}

private enum class AppScreen(val title: String, val icon: ImageVector) {
    Dashboard("Home", Icons.Outlined.Home),
    Coach("Coach", Icons.AutoMirrored.Outlined.Chat),
    Vault("Vault", Icons.Outlined.Folder),
    Elite("Elite", Icons.Outlined.WorkspacePremium),
    Settings("Settings", Icons.Outlined.Settings)
}

private enum class AuthMode {
    SignIn,
    SignUp,
    Reset
}

private val AppCardShape = RoundedCornerShape(8.dp)

@Composable
private fun appCardBorder(): BorderStroke =
    BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.72f))

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PrimaDonnaApp(state: PrimaDonnaState, viewModel: PrimaDonnaViewModel) {
    val snackbarHostState = remember { SnackbarHostState() }
    var selectedScreen by rememberSaveable { mutableStateOf(AppScreen.Dashboard.name) }

    LaunchedEffect(state.error, state.message) {
        val notice = state.error ?: state.message
        if (!notice.isNullOrBlank()) {
            snackbarHostState.showSnackbar(notice)
            viewModel.clearNotice()
        }
    }

    if (state.loading && state.session == null && state.passwordRecoverySession == null) {
        FullScreenLoading()
        return
    }

    if (state.passwordRecoverySession != null) {
        ResetPasswordScreen(
            state = state,
            onSubmit = viewModel::completePasswordReset,
            onCancel = viewModel::signOut
        )
        return
    }

    if (state.session == null) {
        LoginScreen(
            state = state,
            onSignIn = viewModel::signIn,
            onSignUp = viewModel::signUp,
            onResetPassword = viewModel::requestPasswordReset
        )
        return
    }

    val needsOnboarding = !state.loading &&
        (state.data.profile?.businessName.isNullOrBlank() || state.data.centers.isEmpty())
    if (needsOnboarding) {
        OnboardingScreen(
            state = state,
            onSubmit = viewModel::completeOnboarding,
            onSignOut = viewModel::signOut
        )
        return
    }

    val screen = runCatching { AppScreen.valueOf(selectedScreen) }.getOrDefault(AppScreen.Dashboard)
    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            CenterAlignedTopAppBar(
                title = { BrandMark(compact = true) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                ),
                actions = {
                    IconButton(onClick = viewModel::signOut) {
                        Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = "Sign out")
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = PrimaSoft,
                tonalElevation = 0.dp
            ) {
                AppScreen.entries.forEach { item ->
                    NavigationBarItem(
                        selected = item == screen,
                        onClick = { selectedScreen = item.name },
                        icon = {
                            val selectedElite = item == AppScreen.Elite && item == screen
                            Box(
                                modifier = if (selectedElite) {
                                    Modifier
                                        .border(
                                            BorderStroke(1.dp, PrimaPink.copy(alpha = 0.82f)),
                                            RoundedCornerShape(999.dp)
                                        )
                                        .padding(5.dp)
                                } else {
                                    Modifier
                                }
                            ) {
                                Icon(item.icon, contentDescription = item.title)
                            }
                        },
                        label = {
                            Text(
                                item.title,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                fontSize = 11.sp
                            )
                        },
                        alwaysShowLabel = false,
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.onSurface,
                            selectedTextColor = MaterialTheme.colorScheme.onSurface,
                            indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (screen) {
                AppScreen.Dashboard -> DashboardScreen(state)
                AppScreen.Coach -> CoachScreen(state, viewModel)
                AppScreen.Vault -> VaultScreen(state, viewModel)
                AppScreen.Elite -> EliteScreen(state, viewModel)
                AppScreen.Settings -> SettingsScreen(state, viewModel)
            }
            if (state.loading || state.saving) {
                LoadingScrim()
            }
        }
    }
}

@Composable
private fun LoginScreen(
    state: PrimaDonnaState,
    onSignIn: (String, String) -> Unit,
    onSignUp: (String, String, String) -> Unit,
    onResetPassword: (String) -> Unit
) {
    var modeName by rememberSaveable { mutableStateOf(AuthMode.SignIn.name) }
    val mode = runCatching { AuthMode.valueOf(modeName) }.getOrDefault(AuthMode.SignIn)
    var fullName by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    val canSignIn = !state.loading && email.isNotBlank() && password.isNotBlank()
    val canSignUp = !state.loading &&
        fullName.isNotBlank() &&
        email.isNotBlank() &&
        password.length >= 8 &&
        password == confirmPassword
    val canReset = !state.loading && email.isNotBlank()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xFFFFF8FB),
                        Color(0xFFFFEEF6),
                        Color(0xFFFFFBF8)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 30.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            BrandMark(compact = false)
            Spacer(Modifier.height(22.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.96f)),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, Color(0xFFF0DCE6)),
                elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(22.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = when (mode) {
                            AuthMode.SignIn -> "Sign in"
                            AuthMode.SignUp -> "Create account"
                            AuthMode.Reset -> "Reset password"
                        },
                        style = MaterialTheme.typography.displaySmall,
                        fontFamily = FontFamily.Serif,
                        color = Color(0xFF201A1E)
                    )
                    Text(
                        text = when (mode) {
                            AuthMode.SignIn -> "Access your private AI command center."
                            AuthMode.SignUp -> "Create your strategy workspace."
                            AuthMode.Reset -> "Send a secure reset link to your email."
                        },
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        AuthMode.values().forEach { option ->
                            val selected = option == mode
                            val label = when (option) {
                                AuthMode.SignIn -> "Sign in"
                                AuthMode.SignUp -> "Create"
                                AuthMode.Reset -> "Reset"
                            }
                            if (selected) {
                                Button(
                                    onClick = { modeName = option.name },
                                    shape = RoundedCornerShape(999.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = PrimaPink),
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(42.dp)
                                ) {
                                    Text(label, maxLines = 1, fontSize = 12.sp)
                                }
                            } else {
                                OutlinedButton(
                                    onClick = { modeName = option.name },
                                    shape = RoundedCornerShape(999.dp),
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(42.dp)
                                ) {
                                    Text(label, maxLines = 1, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                    if (mode == AuthMode.SignIn && BuildConfig.DEBUG && BuildConfig.QA_EMAIL.isNotBlank() && BuildConfig.QA_PASSWORD.isNotBlank()) {
                        OutlinedButton(
                            onClick = { onSignIn(BuildConfig.QA_EMAIL, BuildConfig.QA_PASSWORD) },
                            enabled = !state.loading,
                            shape = RoundedCornerShape(999.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("QA sign in")
                        }
                    }
                    if (mode == AuthMode.SignUp) {
                        OutlinedTextField(
                            value = fullName,
                            onValueChange = { fullName = it },
                            label = { Text("Your name") },
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email") },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        ),
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (mode != AuthMode.Reset) {
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            label = { Text("Password") },
                            keyboardActions = KeyboardActions(
                                onDone = {
                                    if (mode == AuthMode.SignIn && canSignIn) {
                                        onSignIn(email, password)
                                    }
                                }
                            ),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = if (mode == AuthMode.SignUp) ImeAction.Next else ImeAction.Done
                            ),
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    if (mode == AuthMode.SignUp) {
                        OutlinedTextField(
                            value = confirmPassword,
                            onValueChange = { confirmPassword = it },
                            label = { Text("Confirm password") },
                            keyboardActions = KeyboardActions(
                                onDone = {
                                    if (canSignUp) {
                                        onSignUp(fullName, email, password)
                                    }
                                }
                            ),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Password,
                                imeAction = ImeAction.Done
                            ),
                            visualTransformation = PasswordVisualTransformation(),
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    Button(
                        onClick = {
                            when (mode) {
                                AuthMode.SignIn -> onSignIn(email, password)
                                AuthMode.SignUp -> onSignUp(fullName, email, password)
                                AuthMode.Reset -> onResetPassword(email)
                            }
                        },
                        enabled = when (mode) {
                            AuthMode.SignIn -> canSignIn
                            AuthMode.SignUp -> canSignUp
                            AuthMode.Reset -> canReset
                        },
                        shape = RoundedCornerShape(999.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp)
                    ) {
                        Text(
                            if (state.loading) {
                                "Working..."
                            } else {
                                when (mode) {
                                    AuthMode.SignIn -> "Enter Command Center"
                                    AuthMode.SignUp -> "Create account"
                                    AuthMode.Reset -> "Send reset email"
                                }
                            }
                        )
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
            Text(
                text = "Prima Donna AI",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ResetPasswordScreen(
    state: PrimaDonnaState,
    onSubmit: (String) -> Unit,
    onCancel: () -> Unit
) {
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    val canSubmit = !state.loading && password.length >= 8 && password == confirmPassword

    Box(Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.Center
        ) {
            BrandMark(compact = false)
            Spacer(Modifier.height(40.dp))
            ScreenHeading("Reset password")
            Text(
                text = "Choose a new password for your account.",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(24.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("New password") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                label = { Text("Confirm new password") },
                keyboardActions = KeyboardActions(onDone = { if (canSubmit) onSubmit(password) }),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = { onSubmit(password) },
                enabled = canSubmit,
                shape = RoundedCornerShape(999.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Text(if (state.loading) "Saving..." else "Save password")
            }
            TextButton(onClick = onCancel, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Text("Cancel")
            }
        }
        if (state.loading) {
            LoadingScrim()
        }
    }
}

@Composable
private fun OnboardingScreen(
    state: PrimaDonnaState,
    onSubmit: (String, String, String, String, Center) -> Unit,
    onSignOut: () -> Unit
) {
    val profile = state.data.profile
    var fullName by rememberSaveable(profile?.updatedAt) { mutableStateOf(profile?.fullName.orEmpty()) }
    var businessName by rememberSaveable(profile?.updatedAt) { mutableStateOf(profile?.businessName.orEmpty()) }
    var profileState by rememberSaveable(profile?.updatedAt) { mutableStateOf(profile?.state.orEmpty()) }
    var timezone by rememberSaveable(profile?.updatedAt) { mutableStateOf(profile?.timezone ?: "America/New_York") }
    var centerName by rememberSaveable { mutableStateOf("") }
    var city by rememberSaveable { mutableStateOf("") }
    var centerState by rememberSaveable { mutableStateOf("") }
    var agesServed by rememberSaveable { mutableStateOf("") }
    var enrollment by rememberSaveable { mutableStateOf("") }
    var capacity by rememberSaveable { mutableStateOf("") }
    var tuition by rememberSaveable { mutableStateOf("") }
    var staff by rememberSaveable { mutableStateOf("") }
    var notes by rememberSaveable { mutableStateOf("") }
    val canSubmit = !state.saving && businessName.isNotBlank() && centerName.isNotBlank()

    Box(Modifier.fillMaxSize()) {
        ScreenList {
            Row(verticalAlignment = Alignment.CenterVertically) {
                BrandMark(compact = true)
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onSignOut) {
                    Text("Sign out")
                }
            }
            Eyebrow("Setup")
            SectionTitle("Business profile")
            OutlinedTextField(fullName, { fullName = it }, label = { Text("Your name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(businessName, { businessName = it }, label = { Text("Business name") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(profileState, { profileState = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
                OutlinedTextField(timezone, { timezone = it }, label = { Text("Timezone") }, modifier = Modifier.weight(1f))
            }
            SectionTitle("First center")
            OutlinedTextField(centerName, { centerName = it }, label = { Text("Center name") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(city, { city = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                OutlinedTextField(centerState, { centerState = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
            }
            OutlinedTextField(agesServed, { agesServed = it }, label = { Text("Ages served") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NumberField(enrollment, { enrollment = it }, "Enrollment", Modifier.weight(1f))
                NumberField(capacity, { capacity = it }, "Capacity", Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(tuition, { tuition = it }, label = { Text("Tuition range") }, modifier = Modifier.weight(1f))
                NumberField(staff, { staff = it }, "Staff", Modifier.weight(1f))
            }
            OutlinedTextField(notes, { notes = it }, label = { Text("Notes / context for AI") }, minLines = 3, modifier = Modifier.fillMaxWidth())
            Button(
                onClick = {
                    onSubmit(
                        fullName.trim(),
                        businessName.trim(),
                        profileState.trim(),
                        timezone.trim(),
                        Center(
                            name = centerName.trim(),
                            city = city.trim(),
                            state = centerState.trim(),
                            agesServed = agesServed.trim(),
                            enrollmentSize = enrollment.toIntOrNull(),
                            capacity = capacity.toIntOrNull(),
                            tuitionRange = tuition.trim(),
                            staffCount = staff.toIntOrNull(),
                            notes = notes.trim()
                        )
                    )
                },
                enabled = canSubmit,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(if (state.saving) "Saving..." else "Save setup")
            }
        }
        if (state.saving) {
            LoadingScrim()
        }
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun DashboardScreen(state: PrimaDonnaState) {
    val data = state.data
    val centers = data.centers
    val firstPlayableVideo = data.videos.firstOrNull { it.storagePath != null }
    val tier = tierLabel(data.subscription?.tier)
    val showTierBadge = tier.equals("Elite", ignoreCase = true) || tier.equals("Pro", ignoreCase = true)
    val snapshotCenters = centers.takeIf { it.isNotEmpty() } ?: listOf(
        Center(name = data.profile?.businessName ?: "Your center")
    )

    FixedScreen {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            SectionTitle("Center snapshot")
            if (showTierBadge) {
                MetaBadge(tier, tone = BadgeTone.Gold)
            }
        }
        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            val cardWidth = maxWidth
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                snapshotCenters.forEach { center ->
                    CenterSnapshotPage(
                        center = center,
                        modifier = Modifier.width(cardWidth)
                    )
                }
            }
        }
        SectionTitle("Today's strategic recommendation")
        FeatureCard(
            title = firstPlayableVideo?.title ?: "Raven daily brief",
            body = firstPlayableVideo?.description?.takeIf { it.isNotBlank() }
                ?: "Open the latest published Raven insight from your library."
        )
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun CoachScreen(state: PrimaDonnaState, viewModel: PrimaDonnaViewModel) {
    var mode by rememberSaveable { mutableStateOf("CEO") }
    var prompt by rememberSaveable { mutableStateOf("") }
    var selectedSessionId by rememberSaveable { mutableStateOf<String?>(null) }
    var historyOpen by rememberSaveable { mutableStateOf(false) }
    var waitingForStrategy by rememberSaveable { mutableStateOf(false) }
    var strategyBaselineId by rememberSaveable { mutableStateOf<String?>(null) }
    var strategyPopupId by rememberSaveable { mutableStateOf<String?>(null) }
    val modes = listOf("CEO", "Revenue", "Marketing", "Compliance", "Systems")
    val selectedSession = state.data.coachingSessions.firstOrNull { it.id == selectedSessionId }
    val strategyPopupSession = state.data.coachingSessions.firstOrNull { it.id == strategyPopupId }
    val context = LocalContext.current
    val speechLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val spoken = result.data
                ?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                ?.firstOrNull()
                .orEmpty()
                .trim()
            if (spoken.isNotBlank()) {
                prompt = listOf(prompt.trim(), spoken).filter { it.isNotBlank() }.joinToString(" ")
            }
        }
    }
    val startSpeech: () -> Unit = {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            .putExtra(RecognizerIntent.EXTRA_PROMPT, "Tell Raven what is happening.")
        runCatching { speechLauncher.launch(intent) }
            .onFailure {
                Toast.makeText(context, "Speech recognition is not available on this device.", Toast.LENGTH_LONG).show()
            }
    }
    LaunchedEffect(state.saving, state.data.coachingSessions.firstOrNull()?.id, waitingForStrategy) {
        val latestSession = state.data.coachingSessions.firstOrNull()
        if (waitingForStrategy && !state.saving && latestSession != null && latestSession.id != strategyBaselineId) {
            strategyPopupId = latestSession.id
            waitingForStrategy = false
            strategyBaselineId = null
            prompt = ""
        }
    }

    if (selectedSession != null) {
        ScreenList {
            CoachingSessionDetail(
                session = selectedSession,
                voiceLoading = state.voiceLoadingSessionId == selectedSession.id,
                voicePlaying = state.voicePlayingSessionId == selectedSession.id,
                onBack = { selectedSessionId = null },
                onPlayVoice = { viewModel.playRavenVoice(selectedSession) },
                onStopVoice = { viewModel.stopRavenVoice() },
                onDelete = {
                    viewModel.deleteCoachingSession(selectedSession.id)
                    selectedSessionId = null
                }
            )
        }
        return
    }

    FixedScreen {
        Eyebrow("Coaching Engine")
        ScreenHeading("Open a strategic session.")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            OutlinedButton(
                onClick = { historyOpen = true },
                enabled = state.data.coachingSessions.isNotEmpty(),
                shape = RoundedCornerShape(999.dp)
            ) {
                Icon(Icons.AutoMirrored.Outlined.Chat, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Previous strategies")
            }
        }
        SingleLineFilterBar(
            options = modes,
            selected = mode,
            onSelected = { mode = it }
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = modeDescription(mode),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            OutlinedTextField(
                value = prompt,
                onValueChange = { prompt = it },
                label = { Text("What's the situation?") },
                minLines = 5,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = startSpeech,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Outlined.Mic, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Speak", maxLines = 1)
                }
                Button(
                    onClick = {
                        waitingForStrategy = true
                        strategyBaselineId = state.data.coachingSessions.firstOrNull()?.id
                        viewModel.submitCoachingPrompt(mode, prompt)
                    },
                    enabled = prompt.trim().length >= 3 && !state.saving,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text(if (state.saving) "Thinking" else "Move", maxLines = 1)
                }
            }
        }
    }

    if (strategyPopupSession != null) {
        StrategyReadyDialog(
            session = strategyPopupSession,
            onOpen = {
                selectedSessionId = strategyPopupSession.id
                strategyPopupId = null
            },
            onDismiss = { strategyPopupId = null }
        )
    }

    if (historyOpen) {
        CoachingHistoryDrawer(
            sessions = state.data.coachingSessions,
            voiceLoadingSessionId = state.voiceLoadingSessionId,
            voicePlayingSessionId = state.voicePlayingSessionId,
            onDismiss = { historyOpen = false },
            onOpen = {
                selectedSessionId = it
                historyOpen = false
            },
            onPlayVoice = viewModel::playRavenVoice,
            onStopVoice = viewModel::stopRavenVoice
        )
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun VaultScreen(state: PrimaDonnaState, viewModel: PrimaDonnaViewModel) {
    var category by rememberSaveable { mutableStateOf("All") }
    var selectedTemplateId by rememberSaveable { mutableStateOf<String?>(null) }
    val categories = listOf("All") + state.data.templates.mapNotNull { it.category?.takeIf(String::isNotBlank) }.distinct().sorted()
    val selectedTemplate = state.data.templates.firstOrNull { it.id == selectedTemplateId }
    val filteredTemplates = if (category == "All") {
        state.data.templates
    } else {
        state.data.templates.filter { it.category == category }
    }

    ScreenList {
        if (selectedTemplate != null) {
            TemplateDetail(
                template = selectedTemplate,
                viewModel = viewModel,
                onBack = { selectedTemplateId = null }
            )
            return@ScreenList
        }

        Eyebrow("Template Vault")
        ScreenHeading("The systems behind the strategy.")
        if (state.data.templates.isEmpty()) {
            EmptyState("The Vault is being curated.")
        } else {
            SingleLineFilterBar(
                options = categories,
                selected = category,
                onSelected = { category = it }
            )
            filteredTemplates.forEach { item ->
                TemplateCard(
                    template = item,
                    viewModel = viewModel,
                    onOpen = { selectedTemplateId = item.id }
                )
            }
        }
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun EliteScreen(state: PrimaDonnaState, viewModel: PrimaDonnaViewModel) {
    var section by rememberSaveable { mutableStateOf("Conversations") }
    var threadTitle by rememberSaveable { mutableStateOf("") }
    var threadBody by rememberSaveable { mutableStateOf("") }
    var bookingTopic by rememberSaveable { mutableStateOf("") }
    var replyBody by rememberSaveable(state.selectedEliteThread?.id) { mutableStateOf("") }
    val options = listOf("Conversations", "Schedule")
    val currentSection = section.takeIf { it in options } ?: "Conversations"

    ScreenList {
        Eyebrow("Elite Circle")
        ScreenHeading("Welcome to the room.")
        SingleLineFilterBar(
            options = options,
            selected = currentSection,
            onSelected = { section = it }
        )
        when (currentSection) {
            "Conversations" -> {
                val selectedThread = state.selectedEliteThread
                if (selectedThread != null) {
                    EliteThreadDetailPanel(
                        thread = selectedThread,
                        replies = state.eliteReplies,
                        replyBody = replyBody,
                        onReplyChange = { replyBody = it },
                        onBack = {
                            replyBody = ""
                            viewModel.closeEliteThread()
                        },
                        onReply = {
                            viewModel.replyEliteThread(selectedThread.id, replyBody)
                            replyBody = ""
                        },
                        saving = state.saving
                    )
                } else {
                    val latestThreads = state.data.eliteThreads.sortedByDescending { it.createdAt.orEmpty() }
                    OutlinedButton(onClick = { section = "Schedule" }) {
                        Icon(Icons.Outlined.Schedule, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Book with Raven")
                    }
                    SectionTitle("Latest conversations")
                    if (latestThreads.isEmpty()) {
                        EmptyState("No Elite conversations yet.")
                    } else {
                        latestThreads.forEach { thread ->
                            EliteThreadCard(
                                thread = thread,
                                onOpen = { viewModel.openEliteThread(thread.id) },
                                onDelete = { viewModel.deleteEliteThread(thread.id) }
                            )
                        }
                    }
                    SectionTitle("Start a conversation")
                    OutlinedTextField(
                        value = threadTitle,
                        onValueChange = { threadTitle = it },
                        label = { Text("Title") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = threadBody,
                        onValueChange = { threadBody = it },
                        label = { Text("What should the room know?") },
                        minLines = 4,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Button(
                        onClick = {
                            viewModel.createEliteThread(threadTitle, threadBody)
                            threadTitle = ""
                            threadBody = ""
                        },
                        enabled = threadTitle.trim().length >= 3 && threadBody.trim().length >= 3 && !state.saving
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Post conversation")
                    }
                }
            }
            "Schedule" -> {
                val activeBookings = state.data.ravenBookings.filter { it.isActiveRavenBooking() }
                FeatureCard(
                    title = "Schedule with Raven",
                    body = "Times shown in ${state.data.ravenTimezone ?: ZoneId.systemDefault().id}."
                )
                SectionTitle("Your bookings")
                if (activeBookings.isEmpty()) {
                    EmptyState("No Raven sessions booked.")
                } else {
                    activeBookings.forEach { booking ->
                        RavenBookingCard(
                            booking = booking,
                            onCancel = { viewModel.cancelRavenBooking(booking.id) }
                        )
                    }
                }
                SectionTitle("Book a session")
                OutlinedTextField(
                    value = bookingTopic,
                    onValueChange = { bookingTopic = it },
                    label = { Text("Focus topic (optional)") },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth()
                )
                val visibleSlots = state.data.ravenSlots.take(12)
                if (visibleSlots.isEmpty()) {
                    EmptyState("No Raven availability is open right now.")
                } else {
                    visibleSlots.forEach { slot ->
                        val booked = activeBookings.any { sameSlot(it.startsAt, slot.startsAt) }
                        RavenSlotCard(
                            slot = slot,
                            booked = booked,
                            onBook = { viewModel.bookRavenSlot(slot, bookingTopic) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(state: PrimaDonnaState, viewModel: PrimaDonnaViewModel) {
    val profile = state.data.profile
    val subscription = state.data.subscription
    var fullName by rememberSaveable(profile?.updatedAt) { mutableStateOf(profile?.fullName.orEmpty()) }
    var businessName by rememberSaveable(profile?.updatedAt) { mutableStateOf(profile?.businessName.orEmpty()) }
    var profileState by rememberSaveable(profile?.updatedAt) { mutableStateOf(profile?.state.orEmpty()) }
    var timezone by rememberSaveable(profile?.updatedAt) { mutableStateOf(profile?.timezone ?: "America/New_York") }
    var editingCenterId by rememberSaveable { mutableStateOf<String?>(null) }
    var confirmDeleteCenterId by rememberSaveable { mutableStateOf<String?>(null) }
    var addCenterOpen by rememberSaveable { mutableStateOf(false) }
    var emailBriefs by rememberSaveable { mutableStateOf(true) }
    var eliteReminders by rememberSaveable { mutableStateOf(true) }
    var inAppAlerts by rememberSaveable { mutableStateOf(true) }
    var productUpdates by rememberSaveable { mutableStateOf(false) }

    var centerName by rememberSaveable { mutableStateOf("") }
    var city by rememberSaveable { mutableStateOf("") }
    var centerState by rememberSaveable { mutableStateOf("") }
    var agesServed by rememberSaveable { mutableStateOf("") }
    var enrollment by rememberSaveable { mutableStateOf("") }
    var capacity by rememberSaveable { mutableStateOf("") }
    var tuition by rememberSaveable { mutableStateOf("") }
    var staff by rememberSaveable { mutableStateOf("") }
    var notes by rememberSaveable { mutableStateOf("") }

    fun resetCenterForm() {
        centerName = ""
        city = ""
        centerState = ""
        agesServed = ""
        enrollment = ""
        capacity = ""
        tuition = ""
        staff = ""
        notes = ""
    }

    fun addCenter() {
        viewModel.addCenter(
            Center(
                name = centerName,
                city = city,
                state = centerState,
                agesServed = agesServed,
                enrollmentSize = enrollment.toIntOrNull(),
                capacity = capacity.toIntOrNull(),
                tuitionRange = tuition,
                staffCount = staff.toIntOrNull(),
                notes = notes
            )
        )
        resetCenterForm()
        addCenterOpen = false
    }

    ScreenList {
        Eyebrow("Settings")
        ScreenHeading("Workspace settings")

        MembershipStatusCard(subscription)

        SectionTitle("Notifications")
        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = AppCardShape,
            border = appCardBorder(),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                NotificationPreferenceRow(
                    title = "Email AI brief",
                    body = "Send daily summaries and strategic reminders.",
                    checked = emailBriefs,
                    onCheckedChange = { emailBriefs = it }
                )
                NotificationPreferenceRow(
                    title = "Elite reminders",
                    body = "Show alerts for Elite Circle activity and replies.",
                    checked = eliteReminders,
                    onCheckedChange = { eliteReminders = it }
                )
                NotificationPreferenceRow(
                    title = "In-app alerts",
                    body = "Keep workspace activity visible when you open the app.",
                    checked = inAppAlerts,
                    onCheckedChange = { inAppAlerts = it }
                )
                NotificationPreferenceRow(
                    title = "Product updates",
                    body = "Occasional AI feature and membership notices.",
                    checked = productUpdates,
                    onCheckedChange = { productUpdates = it }
                )
            }
        }

        SectionTitle("Business profile")
        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = AppCardShape,
            border = appCardBorder(),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(fullName, { fullName = it }, label = { Text("Your name") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(businessName, { businessName = it }, label = { Text("Business name") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(profileState, { profileState = it }, label = { Text("State") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(timezone, { timezone = it }, label = { Text("Timezone") }, modifier = Modifier.fillMaxWidth())
                Button(
                    onClick = { viewModel.saveProfile(fullName, businessName, profileState, timezone) },
                    enabled = !state.saving,
                    shape = RoundedCornerShape(999.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Save profile")
                }
            }
        }

        SectionTitle("Your centers")
        if (state.data.centers.isEmpty()) {
            EmptyState("No centers yet. Add your first center.")
        } else {
            state.data.centers.forEach { center ->
                CenterManagementCard(
                    center = center,
                    saving = state.saving,
                    editing = editingCenterId == center.id,
                    confirmingDelete = confirmDeleteCenterId == center.id,
                    onEdit = {
                        editingCenterId = center.id
                        confirmDeleteCenterId = null
                    },
                    onCancelEdit = { editingCenterId = null },
                    onSave = { updated ->
                        editingCenterId = null
                        viewModel.updateCenter(updated)
                    },
                    onAskDelete = {
                        confirmDeleteCenterId = center.id
                        editingCenterId = null
                    },
                    onCancelDelete = { confirmDeleteCenterId = null },
                    onConfirmDelete = {
                        confirmDeleteCenterId = null
                        center.id?.let(viewModel::deleteCenter)
                    }
                )
            }
        }
        Button(
            onClick = { addCenterOpen = true },
            enabled = !state.saving,
            shape = RoundedCornerShape(999.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Outlined.Add, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Add center")
        }
    }

    if (addCenterOpen) {
        AlertDialog(
            onDismissRequest = { addCenterOpen = false },
            title = { Text("Add center") },
            text = {
                Column(
                    modifier = Modifier
                        .heightIn(max = 520.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(centerName, { centerName = it }, label = { Text("Center name") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(city, { city = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                        OutlinedTextField(centerState, { centerState = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
                    }
                    OutlinedTextField(agesServed, { agesServed = it }, label = { Text("Ages served") }, modifier = Modifier.fillMaxWidth())
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        NumberField(enrollment, { enrollment = it }, "Enrollment", Modifier.weight(1f))
                        NumberField(capacity, { capacity = it }, "Capacity", Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(tuition, { tuition = it }, label = { Text("Tuition range") }, modifier = Modifier.weight(1f))
                        NumberField(staff, { staff = it }, "Staff", Modifier.weight(1f))
                    }
                    OutlinedTextField(notes, { notes = it }, label = { Text("Notes / context for AI") }, minLines = 3, modifier = Modifier.fillMaxWidth())
                }
            },
            confirmButton = {
                Button(
                    onClick = ::addCenter,
                    enabled = centerName.isNotBlank() && !state.saving,
                    shape = RoundedCornerShape(999.dp)
                ) {
                    Text("Add center")
                }
            },
            dismissButton = {
                TextButton(onClick = { addCenterOpen = false }) {
                    Text("Close")
                }
            }
        )
    }
}

@Composable
private fun NotificationPreferenceRow(
    title: String,
    body: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text(
                body,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 18.sp
            )
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
@OptIn(ExperimentalLayoutApi::class)
private fun MembershipStatusCard(subscription: Subscription?) {
    val plan = tierLabel(subscription?.tier)
    val status = subscription?.status?.replace("_", " ")?.replaceFirstChar { it.uppercase() } ?: "Unknown"
    val period = subscription?.currentPeriodEnd?.shortDate()?.let { "Renews $it" } ?: "Renewal not set"
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Membership", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                MetaBadge(plan, tone = BadgeTone.Gold)
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                MetaBadge("Plan: $plan", tone = BadgeTone.Gold)
                MetaBadge(status, tone = if (status.equals("Active", ignoreCase = true)) BadgeTone.Pink else BadgeTone.Neutral)
                MetaBadge(period, tone = BadgeTone.Neutral)
            }
        }
    }
}

@Composable
private fun CenterManagementCard(
    center: Center,
    saving: Boolean,
    editing: Boolean,
    confirmingDelete: Boolean,
    onEdit: () -> Unit,
    onCancelEdit: () -> Unit,
    onSave: (Center) -> Unit,
    onAskDelete: () -> Unit,
    onCancelDelete: () -> Unit,
    onConfirmDelete: () -> Unit
) {
    if (editing) {
        CenterEditCard(center = center, saving = saving, onCancel = onCancelEdit, onSave = onSave)
        return
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(center.name ?: "Unnamed center", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                text = listOfNotNull(center.city, center.state).joinToString(", ").ifBlank { "Center details" },
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text("${center.enrollmentSize ?: 0}/${center.capacity ?: 0} enrolled") })
                AssistChip(onClick = {}, label = { Text("${center.staffCount ?: 0} staff") })
                center.tuitionRange?.takeIf { it.isNotBlank() }?.let { AssistChip(onClick = {}, label = { Text(it) }) }
            }
            center.notes?.takeIf { it.isNotBlank() }?.let {
                Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3, overflow = TextOverflow.Ellipsis)
            }
            if (confirmingDelete) {
                Text("Delete this center?", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = onCancelDelete, enabled = !saving, modifier = Modifier.weight(1f)) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = onConfirmDelete,
                        enabled = !saving,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Outlined.Delete, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Delete")
                    }
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = onEdit, enabled = center.id != null && !saving, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Outlined.Edit, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Edit")
                    }
                    TextButton(onClick = onAskDelete, enabled = center.id != null && !saving, modifier = Modifier.weight(1f)) {
                        Icon(Icons.Outlined.Delete, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Delete")
                    }
                }
            }
        }
    }
}

@Composable
private fun CenterEditCard(
    center: Center,
    saving: Boolean,
    onCancel: () -> Unit,
    onSave: (Center) -> Unit
) {
    var centerName by rememberSaveable(center.id) { mutableStateOf(center.name.orEmpty()) }
    var city by rememberSaveable(center.id) { mutableStateOf(center.city.orEmpty()) }
    var centerState by rememberSaveable(center.id) { mutableStateOf(center.state.orEmpty()) }
    var agesServed by rememberSaveable(center.id) { mutableStateOf(center.agesServed.orEmpty()) }
    var enrollment by rememberSaveable(center.id) { mutableStateOf(center.enrollmentSize?.toString().orEmpty()) }
    var capacity by rememberSaveable(center.id) { mutableStateOf(center.capacity?.toString().orEmpty()) }
    var tuition by rememberSaveable(center.id) { mutableStateOf(center.tuitionRange.orEmpty()) }
    var staff by rememberSaveable(center.id) { mutableStateOf(center.staffCount?.toString().orEmpty()) }
    var notes by rememberSaveable(center.id) { mutableStateOf(center.notes.orEmpty()) }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Edit center", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            OutlinedTextField(centerName, { centerName = it }, label = { Text("Center name") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(city, { city = it }, label = { Text("City") }, modifier = Modifier.weight(1f))
                OutlinedTextField(centerState, { centerState = it }, label = { Text("State") }, modifier = Modifier.weight(1f))
            }
            OutlinedTextField(agesServed, { agesServed = it }, label = { Text("Ages served") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NumberField(enrollment, { enrollment = it }, "Enrollment", Modifier.weight(1f))
                NumberField(capacity, { capacity = it }, "Capacity", Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(tuition, { tuition = it }, label = { Text("Tuition range") }, modifier = Modifier.weight(1f))
                NumberField(staff, { staff = it }, "Staff", Modifier.weight(1f))
            }
            OutlinedTextField(notes, { notes = it }, label = { Text("Notes / context for AI") }, minLines = 3, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(onClick = onCancel, enabled = !saving, modifier = Modifier.weight(1f)) {
                    Text("Cancel")
                }
                Button(
                    onClick = {
                        onSave(
                            center.copy(
                                name = centerName,
                                city = city,
                                state = centerState,
                                agesServed = agesServed,
                                enrollmentSize = enrollment.toIntOrNull(),
                                capacity = capacity.toIntOrNull(),
                                tuitionRange = tuition,
                                staffCount = staff.toIntOrNull(),
                                notes = notes
                            )
                        )
                    },
                    enabled = centerName.isNotBlank() && !saving,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Outlined.Edit, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Save")
                }
            }
        }
    }
}

@Composable
private fun BrandMark(compact: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Image(
            painter = painterResource(id = R.drawable.prima_donna_logo),
            contentDescription = "Prima Donna AI",
            modifier = Modifier.size(if (compact) 56.dp else 92.dp),
            contentScale = ContentScale.Fit
        )
        Spacer(Modifier.width(8.dp))
        Text(
            text = "AI",
            color = PrimaPink,
            style = if (compact) MaterialTheme.typography.labelMedium else MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun FixedScreen(content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(start = 20.dp, top = 18.dp, end = 20.dp, bottom = 20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        content()
    }
}

@Composable
private fun ScreenList(content: @Composable ColumnScope.() -> Unit) {
    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(start = 20.dp, top = 18.dp, end = 20.dp, bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            content()
            Spacer(Modifier.height(72.dp))
        }
    }
}

@Composable
private fun ScreenHeading(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.headlineLarge.copy(
            fontFamily = FontFamily.Serif,
            fontSize = 28.sp,
            lineHeight = 34.sp
        ),
        color = MaterialTheme.colorScheme.onBackground
    )
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleLarge.copy(
            fontFamily = FontFamily.Serif,
            fontSize = 23.sp,
            lineHeight = 29.sp
        ),
        modifier = Modifier.padding(top = 8.dp)
    )
}

@Composable
private fun Eyebrow(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = PrimaPink,
        fontWeight = FontWeight.SemiBold
    )
}

private enum class BadgeTone {
    Pink,
    Gold,
    Neutral
}

@Composable
private fun MetaBadge(
    text: String,
    modifier: Modifier = Modifier,
    tone: BadgeTone = BadgeTone.Pink
) {
    val cleanText = text.trim().takeIf { it.isNotBlank() } ?: return
    val color = when (tone) {
        BadgeTone.Pink -> PrimaPink
        BadgeTone.Gold -> PrimaGold
        BadgeTone.Neutral -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val background = when (tone) {
        BadgeTone.Pink -> PrimaPink.copy(alpha = 0.10f)
        BadgeTone.Gold -> PrimaGold.copy(alpha = 0.14f)
        BadgeTone.Neutral -> MaterialTheme.colorScheme.surfaceVariant
    }
    val shape = RoundedCornerShape(999.dp)
    Text(
        text = cleanText.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = color,
        fontWeight = FontWeight.SemiBold,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier
            .background(background, shape)
            .border(BorderStroke(1.dp, color.copy(alpha = 0.22f)), shape)
            .padding(horizontal = 10.dp, vertical = 5.dp)
    )
}

@Composable
private fun AppFilterChip(selected: Boolean, label: String, onClick: () -> Unit) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = {
            Text(
                text = label,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        },
        shape = AppCardShape,
        modifier = Modifier
            .heightIn(min = 42.dp)
            .defaultMinSize(minWidth = 76.dp)
    )
}

@Composable
private fun SingleLineFilterBar(
    options: List<String>,
    selected: String,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        options.forEach { option ->
            AppFilterChip(
                selected = selected == option,
                onClick = { onSelected(option) },
                label = option.replaceFirstChar { it.uppercase() }
            )
        }
    }
}

@Composable
private fun GoldDivider() {
    HorizontalDivider(
        color = PrimaGold.copy(alpha = 0.45f),
        modifier = Modifier
            .padding(vertical = 16.dp)
            .fillMaxWidth()
    )
}

@Composable
private fun StatCard(label: String, value: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(label.uppercase(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontFamily = FontFamily.Serif,
                    lineHeight = 32.sp
                )
            )
        }
    }
}

@Composable
private fun CenterSnapshotPage(center: Center, modifier: Modifier = Modifier) {
    val enrollment = center.enrollmentSize
    val revenue = tuitionMidpoint(center.tuitionRange)?.let { tuition ->
        enrollment?.takeIf { it > 0 }?.let { (tuition * it).roundToInt() }
    }
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        center.name?.takeIf { it.isNotBlank() }?.let {
            MetaBadge(it, tone = BadgeTone.Neutral)
        }
        SnapshotStatCard(
            label = "Enrollment",
            value = enrollment?.takeIf { it > 0 }?.toString() ?: "Add enrollment"
        )
        SnapshotStatCard(
            label = "Est. monthly revenue",
            value = revenue?.let { NumberFormat.getCurrencyInstance().format(it) } ?: "-"
        )
        SnapshotStatCard(
            label = "Facility goal",
            value = center.capacity?.takeIf { it > 0 }?.toString() ?: "-"
        )
    }
}

@Composable
private fun SnapshotStatCard(label: String, value: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
            Text(
                label.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(5.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontFamily = FontFamily.Serif,
                    lineHeight = 30.sp
                )
            )
        }
    }
}

@Composable
private fun FeatureCard(title: String, body: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                text = body,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 22.sp
            )
        }
    }
}

@Composable
private fun EmptyState(text: String) {
    Text(
        text = text,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(vertical = 12.dp)
    )
}

@Composable
private fun TemplateCard(template: TemplateItem, viewModel: PrimaDonnaViewModel, onOpen: (() -> Unit)? = null) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                MetaBadge(template.category?.replaceFirstChar { it.uppercase() } ?: "Resource")
                MetaBadge(tierLabel(template.tierRequired), tone = BadgeTone.Gold)
            }
            Text(
                text = template.title ?: "Untitled template",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 23.sp
            )
            Text(
                text = template.description.orEmpty(),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 22.sp
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (onOpen != null) {
                    OutlinedButton(
                        onClick = onOpen,
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 44.dp)
                    ) {
                        Text("Details", maxLines = 1)
                    }
                }
                val downloadModifier = if (onOpen != null) {
                    Modifier
                        .weight(1f)
                        .heightIn(min = 44.dp)
                } else {
                    Modifier.heightIn(min = 44.dp)
                }
                TextButton(
                    onClick = {
                        val path = template.storagePath ?: return@TextButton
                        scope.launch {
                            runCatching { viewModel.signedUrl("templates", path) }
                                .onSuccess { context.openUrl(it) }
                                .onFailure { Toast.makeText(context, it.message ?: "Download failed.", Toast.LENGTH_LONG).show() }
                        }
                    },
                    enabled = template.storagePath != null,
                    modifier = downloadModifier
                ) {
                    Icon(Icons.Outlined.Download, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Download", maxLines = 1)
                }
            }
        }
    }
}

@Composable
private fun TemplateDetail(template: TemplateItem, viewModel: PrimaDonnaViewModel, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    OutlinedButton(onClick = onBack) {
        Text("Back to Vault")
    }
    Eyebrow(template.category ?: "Template")
    ScreenHeading(template.title ?: "Untitled template")
    MetaBadge("${tierLabel(template.tierRequired)} tier", tone = BadgeTone.Gold)
    FeatureCard(
        title = "Where this helps",
        body = template.description?.takeIf { it.isNotBlank() }
            ?: "Use this template as a ready-made operating system for the selected workflow."
    )
    FeatureCard(
        title = "Recommended next step",
        body = if (template.storagePath != null) {
            "Download it, customize the center-specific details, and save the finished version into your operating folder."
        } else {
            "This resource is listed in the Vault but the file has not been attached yet."
        }
    )
    Button(
        onClick = {
            val path = template.storagePath ?: return@Button
            scope.launch {
                runCatching { viewModel.signedUrl("templates", path) }
                    .onSuccess { context.openUrl(it) }
                    .onFailure { Toast.makeText(context, it.message ?: "Download failed.", Toast.LENGTH_LONG).show() }
            }
        },
        enabled = template.storagePath != null,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(Icons.Outlined.Download, contentDescription = null)
        Spacer(Modifier.width(8.dp))
        Text("Download template")
    }
}

@Composable
private fun VideoRow(video: RavenVideo, viewModel: PrimaDonnaViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Outlined.PlayArrow, contentDescription = null, tint = PrimaPink)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(video.title ?: "Raven insight", fontWeight = FontWeight.SemiBold)
                Text(
                    text = listOfNotNull(video.category, video.durationSeconds?.let { formatDuration(it) }).joinToString(" - "),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            TextButton(
                onClick = {
                    val path = video.storagePath ?: return@TextButton
                    scope.launch {
                        runCatching { viewModel.signedUrl("raven-videos", path) }
                            .onSuccess { context.openUrl(it) }
                            .onFailure { Toast.makeText(context, it.message ?: "Video failed.", Toast.LENGTH_LONG).show() }
                    }
                },
                enabled = video.storagePath != null
            ) {
                Text("Play")
            }
        }
    }
}

@Composable
private fun CoachingSessionRail(
    sessions: List<CoachingSession>,
    voiceLoadingSessionId: String?,
    voicePlayingSessionId: String?,
    onOpen: (CoachingSession) -> Unit,
    onPlayVoice: (CoachingSession) -> Unit,
    onStopVoice: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Previous",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.SemiBold
            )
            if (sessions.isEmpty()) {
                Text(
                    text = "No sessions yet.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    sessions.forEach { session ->
                        CoachingSessionRailItem(
                            session = session,
                            voiceLoading = voiceLoadingSessionId == session.id,
                            voicePlaying = voicePlayingSessionId == session.id,
                            onOpen = { onOpen(session) },
                            onPlayVoice = { onPlayVoice(session) },
                            onStopVoice = onStopVoice
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StrategyReadyDialog(
    session: CoachingSession,
    onOpen: () -> Unit,
    onDismiss: () -> Unit
) {
    val response = session.response?.jsonObjectOrNull()
    val strategicMove = response?.get("strategic_move")?.jsonTextOrNull()
        ?: response?.get("recommendation")?.jsonTextOrNull()
    val summary = response?.get("summary")?.jsonTextOrNull()
    val preview = listOfNotNull(strategicMove, summary, session.prompt)
        .firstOrNull { it.isNotBlank() }
        ?: "Your new strategy is ready to review."
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                MetaBadge(modeLabel(session.mode), tone = BadgeTone.Gold)
                Text("Strategy ready")
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = preview.take(420),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 24.sp
                )
                session.createdAt?.shortDate()?.let { MetaBadge(it, tone = BadgeTone.Neutral) }
            }
        },
        confirmButton = {
            Button(onClick = onOpen, shape = RoundedCornerShape(999.dp)) {
                Text("Open strategy")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

@Composable
private fun CoachingHistoryDrawer(
    sessions: List<CoachingSession>,
    voiceLoadingSessionId: String?,
    voicePlayingSessionId: String?,
    onDismiss: () -> Unit,
    onOpen: (String) -> Unit,
    onPlayVoice: (CoachingSession) -> Unit,
    onStopVoice: () -> Unit
) {
    val orderedSessions = sessions.sortedByDescending { it.createdAt.orEmpty() }
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.24f))
    ) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .clickable(onClick = onDismiss)
        )
        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = RoundedCornerShape(topStart = 28.dp, bottomStart = 28.dp),
            border = BorderStroke(1.dp, Color(0xFFF0DCE6)),
            elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .fillMaxHeight()
                .widthIn(min = 292.dp, max = 360.dp)
                .padding(vertical = 18.dp)
                .clickable { }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Eyebrow("History")
                        Text("Previous strategies", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = onDismiss) {
                        Text("Close")
                    }
                }
                if (orderedSessions.isEmpty()) {
                    EmptyState("No previous strategies yet.")
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        orderedSessions.forEach { session ->
                            CoachingSessionRailItem(
                                session = session,
                                voiceLoading = voiceLoadingSessionId == session.id,
                                voicePlaying = voicePlayingSessionId == session.id,
                                onOpen = { onOpen(session.id) },
                                onPlayVoice = { onPlayVoice(session) },
                                onStopVoice = onStopVoice
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CoachingSessionRailItem(
    session: CoachingSession,
    voiceLoading: Boolean,
    voicePlaying: Boolean,
    onOpen: () -> Unit,
    onPlayVoice: () -> Unit,
    onStopVoice: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f)),
        shape = AppCardShape,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(9.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = modeLabel(session.mode),
                style = MaterialTheme.typography.labelSmall,
                color = PrimaPink,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1
            )
            Text(
                text = session.prompt.orEmpty().ifBlank { session.createdAt?.shortDate().orEmpty() },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            TextButton(
                onClick = onOpen,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Details", maxLines = 1)
            }
            TextButton(
                onClick = if (voicePlaying) onStopVoice else onPlayVoice,
                enabled = session.response != null && !voiceLoading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text(
                    text = when {
                        voiceLoading -> "Load"
                        voicePlaying -> "Stop"
                        else -> "Play"
                    },
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun SessionCard(
    session: CoachingSession,
    voiceLoading: Boolean,
    voicePlaying: Boolean,
    onOpen: () -> Unit,
    onPlayVoice: () -> Unit,
    onStopVoice: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MetaBadge(modeLabel(session.mode))
                session.createdAt?.shortDate()?.let { MetaBadge(it, tone = BadgeTone.Neutral) }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                text = session.prompt.orEmpty().ifBlank { session.response?.toString().orEmpty() }.take(220),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(onClick = onOpen, modifier = Modifier.weight(1f)) {
                    Text("Details")
                }
                OutlinedButton(
                    onClick = if (voicePlaying) onStopVoice else onPlayVoice,
                    enabled = session.response != null && !voiceLoading,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Outlined.PlayArrow, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = when {
                            voiceLoading -> "Loading"
                            voicePlaying -> "Stop"
                            else -> "Play"
                        }
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Outlined.Delete, contentDescription = "Delete session")
                }
            }
        }
    }
}

@Composable
private fun CoachingSessionDetail(
    session: CoachingSession,
    voiceLoading: Boolean,
    voicePlaying: Boolean,
    onBack: () -> Unit,
    onPlayVoice: () -> Unit,
    onStopVoice: () -> Unit,
    onDelete: () -> Unit
) {
    val response = session.response?.jsonObjectOrNull()
    val diagnosis = response?.get("diagnosis")?.jsonTextOrNull()
    val impact = response?.get("impact")?.jsonTextOrNull()
    val strategicMove = response?.get("strategic_move")?.jsonTextOrNull()
        ?: response?.get("recommendation")?.jsonTextOrNull()
    val elevation = response?.get("elevation")?.jsonTextOrNull()
    val summary = response?.get("summary")?.jsonTextOrNull()
    val sectionBodies = listOfNotNull(
        diagnosis,
        impact,
        strategicMove,
        elevation,
        summary
    ).filter { it.isNotBlank() }
    val actionSteps = (
        response?.get("action_steps")?.jsonArrayOrNull()
            ?: response?.get("actions")?.jsonArrayOrNull()
        )
        ?.mapNotNull { it.jsonTextOrNull() }
        .orEmpty()
    val fallbackResponse = session.response
        ?.takeIf { sectionBodies.isEmpty() && actionSteps.isEmpty() }
        ?.toString()
        ?.take(1200)

    OutlinedButton(onClick = onBack) {
        Text("Back to sessions")
    }
    Eyebrow("${modeLabel(session.mode)} Mode")
    ScreenHeading(session.createdAt?.shortDateTime() ?: "Saved coaching session")
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        MetaBadge(modeLabel(session.mode))
        session.createdAt?.shortDate()?.let { MetaBadge(it, tone = BadgeTone.Neutral) }
    }
    FeatureCard(
        title = "Prompt",
        body = session.prompt?.takeIf { it.isNotBlank() } ?: "No prompt was saved."
    )
    StrategySection("Diagnosis", diagnosis)
    StrategySection("Impact", impact)
    StrategySection("Strategic move", strategicMove)
    StrategySection("Elevation", elevation)
    StrategySection("Summary", summary)
    StrategySection("Saved response", fallbackResponse)
    if (actionSteps.isNotEmpty()) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White),
            shape = AppCardShape,
            border = appCardBorder(),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(18.dp)) {
                Text("Action steps", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                actionSteps.forEachIndexed { index, step ->
                    Text(
                        text = "${index + 1}. $step",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 3.dp)
                    )
                }
            }
        }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Button(
            onClick = if (voicePlaying) onStopVoice else onPlayVoice,
            enabled = session.response != null && !voiceLoading,
            modifier = Modifier.weight(1f)
        ) {
            Icon(Icons.Outlined.PlayArrow, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text(
                text = when {
                    voiceLoading -> "Preparing voice"
                    voicePlaying -> "Stop voice"
                    else -> "Play Raven voice"
                }
            )
        }
        TextButton(onClick = onDelete) {
            Icon(Icons.Outlined.Delete, contentDescription = null)
            Spacer(Modifier.width(6.dp))
            Text("Delete")
        }
    }
}

@Composable
private fun StrategySection(title: String, body: String?) {
    body?.takeIf { it.isNotBlank() }?.let {
        FeatureCard(title = title, body = it)
    }
}

@Composable
private fun EliteThreadDetailPanel(
    thread: EliteThread,
    replies: List<EliteReply>,
    replyBody: String,
    onReplyChange: (String) -> Unit,
    onBack: () -> Unit,
    onReply: () -> Unit,
    saving: Boolean
) {
    TextButton(onClick = onBack) {
        Text("Back to conversations")
    }
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(18.dp)) {
            Text(
                text = thread.title ?: "Untitled conversation",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = listOfNotNull(thread.authorName, thread.createdAt?.shortDateTime()).joinToString(" - "),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(Modifier.height(12.dp))
            Text(thread.body.orEmpty(), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
    SectionTitle("Replies")
    if (replies.isEmpty()) {
        EmptyState("No replies yet.")
    } else {
        replies.forEach { reply ->
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = AppCardShape,
                border = appCardBorder(),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        text = listOfNotNull(reply.authorName, reply.createdAt?.shortDateTime()).joinToString(" - "),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(reply.body.orEmpty())
                }
            }
        }
    }
    SectionTitle("Add reply")
    OutlinedTextField(
        value = replyBody,
        onValueChange = onReplyChange,
        label = { Text("Reply") },
        minLines = 4,
        modifier = Modifier.fillMaxWidth()
    )
    Button(
        onClick = onReply,
        enabled = replyBody.trim().length >= 2 && !saving,
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = null)
        Spacer(Modifier.width(8.dp))
        Text("Post reply")
    }
}

@Composable
private fun EliteThreadCard(thread: EliteThread, onOpen: () -> Unit, onDelete: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(18.dp)) {
            Text(
                text = thread.title ?: "Untitled conversation",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = listOfNotNull(thread.authorName, thread.createdAt?.shortDateTime()).joinToString(" - "),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = thread.body.orEmpty().take(320),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${thread.replyCount ?: 0} replies",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.weight(1f)
                )
                OutlinedButton(onClick = onOpen) {
                    Icon(Icons.AutoMirrored.Outlined.Chat, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Open")
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Outlined.Delete, contentDescription = "Delete conversation")
                }
            }
        }
    }
}

@Composable
private fun RavenBookingCard(booking: RavenBooking, onCancel: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(18.dp)) {
            Text(
                text = booking.startsAt?.timeRange(booking.endsAt) ?: "Raven session",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = booking.topic?.takeIf { it.isNotBlank() } ?: "Strategy session",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                MetaBadge(booking.status ?: "booked", modifier = Modifier.weight(1f, fill = false))
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onCancel) {
                    Text("Cancel")
                }
            }
        }
    }
}

@Composable
private fun RavenSlotCard(slot: RavenSlot, booked: Boolean, onBook: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = AppCardShape,
        border = appCardBorder(),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Outlined.Schedule, contentDescription = null, tint = PrimaPink)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(slot.startsAt.timeRange(slot.endsAt), fontWeight = FontWeight.SemiBold)
                Text(
                    text = slot.startsAt.shortDateTime().substringBefore(" "),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (booked) {
                MetaBadge("Booked")
            } else {
                Button(onClick = onBook, shape = RoundedCornerShape(10.dp)) {
                    Text("Book")
                }
            }
        }
    }
}

@Composable
private fun NumberField(value: String, onValueChange: (String) -> Unit, label: String, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = { onValueChange(it.filter(Char::isDigit)) },
        label = { Text(label) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        modifier = modifier
    )
}

@Composable
private fun FullScreenLoading() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
private fun LoadingScrim() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator()
    }
}

private fun Context.openUrl(url: String) {
    startActivity(Intent(Intent.ACTION_VIEW, url.toUri()))
}

private fun tierLabel(value: String?): String {
    val raw = value?.replace("_", " ")?.trim().orEmpty()
    return if (raw.isBlank()) "Essentials" else raw.replaceFirstChar { it.uppercase() }
}

private fun modeDescription(mode: String): String {
    return when (mode) {
        "Revenue" -> "Pricing - Enrollment - Retention"
        "Marketing" -> "Positioning - Content - Lead generation"
        "Compliance" -> "Licensing - Risk - Safety"
        "Systems" -> "Operations - Staffing - SOPs"
        else -> "Vision - Leadership - Decisions"
    }
}

private fun modeLabel(mode: String?): String {
    return when (mode?.lowercase()) {
        "revenue" -> "Revenue"
        "marketing" -> "Marketing"
        "compliance" -> "Compliance"
        "systems" -> "Systems"
        else -> "CEO"
    }
}

private fun tuitionMidpoint(value: String?): Double? {
    val numbers = Regex("\\d+").findAll(value.orEmpty()).map { it.value.toDouble() }.toList()
    return if (numbers.isEmpty()) null else numbers.average()
}

private fun List<Double>.averageOrNull(): Double? {
    return if (isEmpty()) null else average()
}

private fun formatDuration(seconds: Int): String {
    val minutes = seconds / 60
    val remainder = seconds % 60
    return "$minutes:${remainder.toString().padStart(2, '0')}"
}

private fun JsonElement.jsonObjectOrNull(): JsonObject? = runCatching { jsonObject }.getOrNull()

private fun JsonElement.jsonArrayOrNull(): JsonArray? = runCatching { jsonArray }.getOrNull()

private fun JsonElement.jsonTextOrNull(): String? {
    return when (this) {
        is JsonPrimitive -> contentOrNull
        else -> toString().takeIf { it.isNotBlank() && it != "null" }
    }
}

private fun String.shortDate(): String {
    return runCatching {
        OffsetDateTime.parse(this).format(DateTimeFormatter.ofPattern("M/d/yyyy"))
    }.getOrDefault(take(10))
}

private fun String.shortDateTime(): String {
    return runCatching {
        OffsetDateTime.parse(this)
            .atZoneSameInstant(ZoneId.systemDefault())
            .format(DateTimeFormatter.ofPattern("M/d/yyyy h:mm a"))
    }.getOrDefault(take(16).replace("T", " "))
}

private fun String.timeRange(end: String?): String {
    val startText = shortDateTime()
    val endText = end?.let {
        runCatching {
            OffsetDateTime.parse(it)
                .atZoneSameInstant(ZoneId.systemDefault())
                .format(DateTimeFormatter.ofPattern("h:mm a"))
        }.getOrNull()
    }
    return if (endText.isNullOrBlank()) startText else "$startText - $endText"
}

private fun sameSlot(left: String?, right: String?): Boolean {
    if (left.isNullOrBlank() || right.isNullOrBlank()) return false
    val leftInstant = runCatching { OffsetDateTime.parse(left).toInstant() }.getOrNull()
    val rightInstant = runCatching { OffsetDateTime.parse(right).toInstant() }.getOrNull()
    return if (leftInstant != null && rightInstant != null) {
        leftInstant == rightInstant
    } else {
        left.take(16) == right.take(16)
    }
}

private fun RavenBooking.isActiveRavenBooking(): Boolean {
    val normalized = status?.trim()?.lowercase()
    return normalized !in setOf("cancelled", "canceled", "completed", "declined")
}
